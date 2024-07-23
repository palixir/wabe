import type { Context, WobeHandler } from 'wobe'
import type { ProviderEnum } from '../../authentication/interface'
import type { WibeContext } from '../interface'
import { authHandler, oauthHandlerCallback } from './authHandler'

export interface WibeRoute {
	method: 'GET' | 'POST' | 'PUT' | 'DELETE'
	path: string
	handler: WobeHandler<{ wibe: WibeContext<any> }>
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
