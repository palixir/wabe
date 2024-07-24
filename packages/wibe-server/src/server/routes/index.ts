import type { WobeHandler } from 'wobe'
import type { ProviderEnum } from '../../authentication/interface'
import { authHandler, oauthHandlerCallback } from './authHandler'
import type { WobeCustomContext } from '..'

export interface WibeRoute {
	method: 'GET' | 'POST' | 'PUT' | 'DELETE'
	path: string
	handler: WobeHandler<WobeCustomContext<any>>
}

export const defaultRoutes = (): WibeRoute[] => [
	{
		method: 'GET',
		path: '/tata/tutu',
		handler: (ctx) => {
			ctx.res.send('OK')
		},
	},
	{
		method: 'GET',
		path: '/auth/oauth',
		handler: async (context) => {
			const provider = context.query.provider

			if (!provider)
				throw new Error('Authentication failed, provider not found')

			// TODO: Maybe check if the value is in the enum
			return authHandler(context, context.wibe, provider as ProviderEnum)
		},
	},
	{
		method: 'GET',
		path: '/auth/oauth/callback',
		handler: async (context) => {
			return oauthHandlerCallback(context, context.wibe)
		},
	},
]
