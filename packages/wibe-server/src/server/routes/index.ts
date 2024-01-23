import { Context } from 'elysia'
import crypto from 'crypto'
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
		path: '/auth/test',
		handler: async (context: Context) => {
			try {
				const { config } = WibeApp

				const { authentication } = config

				const codeVerifier = crypto
					.randomBytes(32)
					.toString('base64')
					.replace(/\+/g, '-')
					.replace(/\//g, '_')
					.replace(/=/g, '')

				// Create cookie to store code verifier
				context.cookie.codeVerifier.add({
					value: codeVerifier,
					httpOnly: true,
					path: '/',
					expires: new Date(Date.now() + 1000 * 60), // 1 minute
				})

				const codeChallenge = new Bun.SHA256()
					.update(codeVerifier)
					.digest('hex')

				context.set.redirect = `https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&include_granted_scopes=true&response_type=code&state=state&redirect_uri=http://127.0.0.1:3000/auth/provider/google&client_id=${authentication?.providers.GOOGLE?.clientId}&code_challenge=${codeChallenge}&code_challenge_method=S256&scope=email%20openid`
			} catch (e) {
				console.log(e)
			}
		},
	},
]
