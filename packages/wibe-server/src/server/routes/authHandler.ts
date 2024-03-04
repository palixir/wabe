import { Context } from 'elysia'
import { WibeApp } from '..'
import { ProviderEnum } from '../../authentication/interface'
import { Google } from '../../authentication/oauth/Google'

const _getProviderAdapter = ({
	provider,
	clientId,
	clientSecret,
}: {
	provider: ProviderEnum
	clientId: string
	clientSecret: string
}) => {
	switch (provider) {
		case ProviderEnum.GOOGLE:
			return new Google(
				clientId,
				clientSecret,
				`http://127.0.0.1:${WibeApp.config.port}/auth/provider/google`,
			)
		default:
			throw new Error('Provider not found')
	}
}

export const authHandler = async (context: Context, provider: ProviderEnum) => {
	if (!WibeApp.config) throw new Error('Wibe config not found')

	const code = context.query.code
	// TODO : Check maybe it's better to store it in http cookie.
	// https://www.rfc-editor.org/rfc/rfc7636#section-4.4 not precise the storage of codeVerifier
	const codeVerifier = context.query.codeVerifier

	if (!code || !codeVerifier) throw new Error('Authentication failed')

	const { authentication } = WibeApp.config

	if (!authentication) throw new Error('Authentication config not found')

	const clientId = authentication.providers?.[provider]?.clientId
	const clientSecret = authentication.providers?.[provider]?.clientSecret

	if (!clientId || !clientSecret)
		throw new Error('Client id or secret not found')

	try {
		const providerAdapter = _getProviderAdapter({
			provider,
			clientId,
			clientSecret,
		})

		const { accessToken, refreshToken } =
			await providerAdapter.validateAuthorizationCode(code, codeVerifier)

		context.set.redirect = authentication.successRedirectPath
	} catch (e) {
		console.error(e)
		context.set.redirect = authentication.failureRedirectPath
	}
}
