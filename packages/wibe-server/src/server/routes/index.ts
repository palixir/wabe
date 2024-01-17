import { Context } from 'elysia'
import { googleAuthHandler } from './handlers/googleAuth'

export interface WibeRoute {
	method: 'GET' | 'POST' | 'PUT' | 'DELETE'
	path: string
	handler: (context: Context) => Promise<void>
}

export const defaultRoutes = (): WibeRoute[] => [
	{
		method: 'POST',
		path: '/auth/provider/google',
		handler: googleAuthHandler,
	},
]
