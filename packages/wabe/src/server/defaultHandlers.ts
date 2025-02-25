import type { Wabe, WobeCustomContext } from '.'
import { Session } from '../authentication/Session'
import { getCookieInRequestHeaders } from '../utils'
import type { DevWabeTypes } from '../utils/helper'

export const defaultSessionHandler =
  (wabe: Wabe<DevWabeTypes>) =>
  async (ctx: WobeCustomContext<DevWabeTypes>) => {
    const headers = ctx.request.headers

    if (headers.get('Wabe-Root-Key') === wabe.config.rootKey) {
      ctx.wabe = {
        isRoot: true,
        wabe,
        response: ctx.res,
      }
      return
    }

    const getAccessToken = () => {
      if (headers.get('Wabe-Access-Token'))
        return { accessToken: headers.get('Wabe-Access-Token') }

      const isCookieSession =
        !!wabe.config.authentication?.session?.cookieSession

      if (isCookieSession)
        return {
          accessToken: getCookieInRequestHeaders(
            'accessToken',
            ctx.request.headers,
          ),
        }

      return { accessToken: null }
    }

    const { accessToken } = getAccessToken()

    if (!accessToken) {
      ctx.wabe = {
        isRoot: false,
        wabe,
        response: ctx.res,
      }
      return
    }

    const session = new Session()

    const {
      user,
      sessionId,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    } = await session.meFromAccessToken(accessToken, {
      isRoot: true,
      wabe,
    })

    ctx.wabe = {
      isRoot: false,
      sessionId,
      user,
      wabe,
      response: ctx.res,
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
        expires: session.getAccessTokenExpireAt(wabe.config),
        sameSite: 'None',
        secure: true,
      })
    }
  }
