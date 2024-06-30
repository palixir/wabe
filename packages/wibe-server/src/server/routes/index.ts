import { authHandler, oauthHandlerCallback } from './authHandler'
import type { ProviderEnum } from '../../authentication/interface'
import type { Context } from 'wobe'

export interface WibeRoute {
	method: 'GET' | 'POST' | 'PUT' | 'DELETE'
	path: string
	handler: (context: Context) => Promise<void>
}

export const defaultRoutes = (): WibeRoute[] => [
	{
		method: 'GET',
		path: '/toto',
		handler: async (context: Context) => {
			context.redirect('http://localhost:5173')
		},
	},
	{
		method: 'GET',
		path: '/auth/oauth',
		handler: async (context: Context) => {
			const provider = context.query.provider

			if (!provider)
				throw new Error('Authentication failed, provider not found')

			// TODO: Maybe check if the value is in the enum
			return authHandler(context, {} as any, provider as ProviderEnum)
		},
	},
	{
		method: 'GET',
		path: '/auth/oauth/callback',
		handler: async (context: Context) => {
			return oauthHandlerCallback(context, {} as any)
		},
	},
]
