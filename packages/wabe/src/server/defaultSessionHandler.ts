import type { Wabe, WobeCustomContext } from '.'
import { Session } from '../authentication/Session'
import { getCookieInRequestHeaders, isValidRootKey } from '../utils'
import type { DevWabeTypes } from '../utils/helper'

export const defaultSessionHandler =
	(wabe: Wabe<DevWabeTypes>) => async (ctx: WobeCustomContext<DevWabeTypes>) => {
		const headers = ctx.request.headers
		const isGraphQLCall = ctx.request.url.includes('/graphql')

		if (isValidRootKey(headers, wabe.config.rootKey)) {
			ctx.wabe = {
				isRoot: true,
				wabe,
				response: ctx.res,
				isGraphQLCall,
			}
			return
		}

		const getAccessToken = () => {
			if (headers.get('Wabe-Access-Token')) return { accessToken: headers.get('Wabe-Access-Token') }

			const isCookieSession = !!wabe.config.authentication?.session?.cookieSession

			if (isCookieSession)
				return {
					accessToken: getCookieInRequestHeaders('accessToken', ctx.request.headers),
				}

			return { accessToken: null }
		}

		const { accessToken } = getAccessToken()

		if (!accessToken) {
			ctx.wabe = {
				isRoot: false,
				wabe,
				response: ctx.res,
				isGraphQLCall,
			}
			return
		}

		const getCsrfToken = () => {
			if (headers.get('Wabe-Csrf-Token')) return { csrfToken: headers.get('Wabe-Csrf-Token') || '' }

			return { csrfToken: '' }
		}

		const { csrfToken } = getCsrfToken()

		const session = new Session<DevWabeTypes>()

		const {
			user,
			sessionId,
			accessToken: newAccessToken,
			refreshToken: newRefreshToken,
		} = await session.meFromAccessToken(
			{ accessToken, csrfToken },
			{
				wabe,
				isRoot: true,
				isGraphQLCall,
			},
		)

		ctx.wabe = {
			isRoot: false,
			sessionId,
			user,
			wabe,
			response: ctx.res,
			isGraphQLCall,
		}

		if (
			wabe.config.authentication?.session?.cookieSession &&
			newAccessToken &&
			newRefreshToken &&
			newAccessToken !== accessToken
		) {
			ctx.res.setCookie('accessToken', newAccessToken, {
				httpOnly: true,
				path: '/',
				expires: session.getAccessTokenExpireAt(wabe.config),
				sameSite: 'None',
				secure: true,
			})

			ctx.res.setCookie('refreshToken', newRefreshToken, {
				httpOnly: true,
				path: '/',
				expires: session.getRefreshTokenExpireAt(wabe.config),
				sameSite: 'None',
				secure: true,
			})
		}
	}
