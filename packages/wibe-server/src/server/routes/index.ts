import { Context } from 'elysia'
import { authHandler } from './authHandler'
import { ProviderEnum } from '../../authentication/interface'

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
]
