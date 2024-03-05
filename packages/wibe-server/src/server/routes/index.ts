import { Context } from 'elysia'
import { authHandler, oauthHandlerCallback } from './authHandler'
import { ProviderEnum } from '../../authentication/interface'

export interface WibeRoute {
	method: 'GET' | 'POST' | 'PUT' | 'DELETE'
	path: string
	handler: (context: Context) => Promise<void>
}

export const defaultRoutes = (): WibeRoute[] => [
	{
		method: 'GET',
		path: '/auth/oauth',
		handler: async (context: Context) => {
			const provider = context.query.provider

			if (!provider)
				throw new Error('Authentication failed, provider not found')

			// TODO: Maybe check if the value is in the enum
			authHandler(context, provider as ProviderEnum)
		},
	},
	{
		method: 'GET',
		path: '/auth/oauth/callback',
		handler: async (context: Context) => {
			oauthHandlerCallback(context)
		},
	},
]
