import { type WobeHandler, uploadDirectory } from 'wobe'
import { ProviderEnum } from '../../authentication/interface'
import { authHandler, oauthHandlerCallback } from './authHandler'
import type { WobeCustomContext } from '..'

const validProviders = new Set<string>(Object.values(ProviderEnum))

export interface WabeRoute {
	method: 'GET' | 'POST' | 'PUT' | 'DELETE'
	path: string
	handler: WobeHandler<WobeCustomContext<any>>
}

export const defaultRoutes = ({
	devDirectory,
	enableBucketRoute,
}: {
	devDirectory: string
	enableBucketRoute: boolean
}): WabeRoute[] => {
	const routes: WabeRoute[] = [
		{
			method: 'GET',
			path: '/auth/oauth',
			handler: (context) => {
				const provider = context.query.provider

				if (!provider || !validProviders.has(provider))
					throw new Error('Authentication failed, invalid provider')

				return authHandler(context, context.wabe, provider as ProviderEnum)
			},
		},
		{
			method: 'GET',
			path: '/auth/oauth/callback',
			handler: (context) => oauthHandlerCallback(context, context.wabe),
		},
	]

	if (enableBucketRoute) {
		routes.push({
			method: 'GET',
			path: '/bucket/:filename',
			handler: uploadDirectory({ directory: devDirectory }),
		})
	}

	return routes
}
