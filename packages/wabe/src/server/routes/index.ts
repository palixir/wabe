import { type WobeHandler, uploadDirectory } from 'wobe'
import { ProviderEnum } from '../../authentication/interface'
import { authHandler, oauthHandlerCallback } from './authHandler'
import type { WobeCustomContext } from '..'

const validProviders = new Set<string>(Object.values(ProviderEnum))

const BUCKET_PREFIX = '/bucket/'

const bucketHandler = ({
	devDirectory,
}: {
	devDirectory: string
}): WobeHandler<WobeCustomContext<any>> => {
	const baseHandler = uploadDirectory({ directory: devDirectory })

	return (ctx) => {
		// `uploadDirectory` reads `ctx.params.filename` to resolve the file on
		// disk. The default route `/bucket/:filename` only matches a single path
		// segment, so nested file names (e.g. `userId/docId/file.json`) get a 404.
		// We register the route as a wildcard and reconstruct the full nested
		// file name from the request pathname here.
		if (ctx.pathname.startsWith(BUCKET_PREFIX)) {
			const rawFileName = ctx.pathname.slice(BUCKET_PREFIX.length)

			try {
				ctx.params.filename = decodeURIComponent(rawFileName)
			} catch {
				ctx.params.filename = rawFileName
			}
		}

		return baseHandler(ctx)
	}
}

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
			path: '/bucket/*',
			handler: bucketHandler({ devDirectory }),
		})
	}

	return routes
}
