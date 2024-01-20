import { Context } from 'elysia'
import { googleAuthHandler } from './handlers/googleAuth'
import { xAuthHandler } from './handlers/xAuth'

export interface WibeRoute {
	method: 'GET' | 'POST' | 'PUT' | 'DELETE'
	path: string
	handler: (context: Context) => Promise<void>
}

export const defaultRoutes = (): WibeRoute[] => [
	{
		method: 'GET',
		path: '/auth/provider/google',
		handler: googleAuthHandler,
	},
	{
		method: 'GET',
		path: '/auth/provider/x',
		handler: xAuthHandler,
	},
]
