import { Context } from 'elysia'
import { authHandler } from './authHandler'
import { ProviderEnum } from '../../authentication/interface'
import { WibeApp } from '..'

export interface WibeRoute {
	method: 'GET' | 'POST' | 'PUT' | 'DELETE'
	path: string
	handler: (context: Context) => Promise<void>
}

export const defaultRoutes = (): WibeRoute[] => [
	{
		method: 'GET',
		path: '/auth/provider/google',
		handler: (context: Context) =>
			authHandler(context, ProviderEnum.GOOGLE),
	},
	{
		method: 'GET',
		path: '/auth/provider/x',
		handler: (context: Context) => authHandler(context, ProviderEnum.X),
	},
	{
		method: 'GET',
		path: '/auth',
		handler: async (context: Context) => {
			try {
				const { config } = WibeApp

				const { authentication } = config

				if (!context.query.provider)
					throw new Error('Provider not found')

				const provider =
					context.query.provider.toUpperCase() as ProviderEnum

				switch (provider) {
					case ProviderEnum.GOOGLE:
						context.set.redirect = `https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&include_granted_scopes=true&response_type=code&state=state&redirect_uri=http://127.0.0.1:3000/auth/provider/google&client_id=${authentication?.providers.GOOGLE?.clientId}&scope=email%20openid`
						break

					default:
						break
				}
			} catch (e) {
				console.error(e)
			}
		},
	},
]
