import { Context } from 'elysia'
import { WibeApp } from '..'
import { GoogleProvider } from '../../authentication/providers/google'
import { ProviderEnum } from '../../authentication/interface'
import { XProvider } from '../../authentication/providers/x'

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
			return new GoogleProvider(clientId, clientSecret)
		case ProviderEnum.X:
			return new XProvider(clientId, clientSecret)
		default:
			throw new Error('Provider not found')
	}
}

export const authHandler = async (context: Context, provider: ProviderEnum) => {
	if (!WibeApp.config) throw new Error('Wibe config not found')

	const code = context.query.code

	if (!code) throw new Error('Authentication : Authorization code not found')

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

		await providerAdapter.validateTokenFromAuthorizationCode({
			code,
		})

		context.set.redirect = authentication.successRedirectPath
	} catch (e) {
		console.error(e)
		context.set.redirect = authentication.failureRedirectPath
	}
}
