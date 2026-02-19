import { type WobeHandler, uploadDirectory } from 'wobe'
import type { ProviderEnum } from '../../authentication/interface'
import { authHandler, oauthHandlerCallback } from './authHandler'
import type { WobeCustomContext } from '..'

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

				if (!provider) throw new Error('Authentication failed, provider not found')

				// TODO: Maybe check if the value is in the enum
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
