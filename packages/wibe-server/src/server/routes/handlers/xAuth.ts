import { Context } from 'elysia'
import { WibeApp } from '../..'
import { XProvider } from '../../../authentication/providers/x'

export const xAuthHandler = async (context: Context) => {
	if (!WibeApp.config) throw new Error('Wibe config not found')

	const code = context.query.code

	const { authentication: authenticationConfig } = WibeApp.config

	if (!authenticationConfig)
		throw new Error('Authentication config not found')

	const clientId = authenticationConfig.providers.X?.clientId
	const clientSecret = authenticationConfig.providers.X?.clientSecret

	if (!code) throw new Error('Authentication : Google code not found')

	if (!clientId || !clientSecret)
		throw new Error('Authentication : Google client id or secret not found')

	try {
		const xProvider = new XProvider(clientId, clientSecret)

		const { accessToken, refreshToken } =
			await xProvider.validateTokenFromAuthorizationCode(code)

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

		context.set.redirect = authenticationConfig.successRedirectPath
	} catch (e) {
		// console.error(e)
		context.set.redirect = authenticationConfig?.failureRedirectPath
	}
}
