import { Context } from 'elysia'
import { WibeApp } from '.'
import { GoogleProvider } from '../authentication/providers/google'

export const googleAuthHandler = async (context: Context) => {
	const code = context.query.code
	const { authentication: authenticationConfig } = WibeApp.config

	if (!authenticationConfig)
		throw new Error('Authentication config not found')

	// 296431040556-4jh84e5s264rmrgnh8bmegb0kl550teg.apps.googleusercontent.com
	const clientId = authenticationConfig.providers.GOOGLE.clientId
	// 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
	const clientSecret = authenticationConfig.providers.GOOGLE.clientSecret

	if (!code || !clientId)
		throw new Error('Authentication : Google client id or secret not found')

	const googleProvider = new GoogleProvider(clientId, clientSecret)

	try {
		const { accessToken, refreshToken } =
			await googleProvider.validateTokenFromAuthorizationCode(code)

		// Create cookie for access and refresh token
		context.cookie.accessToken.add({
			value: accessToken,
			httpOnly: true,
			path: '/',
			expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
		})

		context.cookie.refreshToken.add({
			value: refreshToken,
			httpOnly: true,
			path: '/',
			expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
		})

		context.set.redirect = 'http://localhost:5173'
	} catch (e) {
		console.error(e)
		context.set.redirect = authenticationConfig?.failureRedirectPath
	}
}
