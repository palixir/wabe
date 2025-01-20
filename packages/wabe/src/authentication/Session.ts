import jwt from 'jsonwebtoken'
import type { WabeContext } from '../server/interface'
import type { User } from '../../generated/wabe'
import type { WabeConfig } from '../server'
import { contextWithRoot } from '../utils/export'

export class Session {
  private accessToken: string | undefined = undefined
  private refreshToken: string | undefined = undefined

  getAccessTokenExpireAt(config: WabeConfig<any>) {
    const customExpiresInMs =
      config?.authentication?.session?.accessTokenExpiresInMs

    if (!customExpiresInMs) return new Date(Date.now() + 1000 * 60 * 15) // 15 minutes in ms

    return new Date(Date.now() + customExpiresInMs)
  }

  _getRefreshTokenExpiresInMs(config: WabeConfig<any>) {
    const customExpiresInMs =
      config?.authentication?.session?.refreshTokenExpiresInMs

    if (!customExpiresInMs) return 1000 * 60 * 60 * 24 * 30 // 30 days in ms

    return customExpiresInMs
  }

  getRefreshTokenExpireAt(config: WabeConfig<any>) {
    const expiresInMs = this._getRefreshTokenExpiresInMs(config)

    return new Date(Date.now() + expiresInMs)
  }

  async meFromAccessToken(
    accessToken: string,
    context: WabeContext<any>,
  ): Promise<{ sessionId: string | null; user: User | null }> {
    const sessions = await context.wabe.controllers.database.getObjects({
      className: '_Session',
      where: {
        accessToken: { equalTo: accessToken },
      },
      first: 1,
      fields: ['user.*', 'user.role.*', 'id'],
      context,
    })

    if (sessions.length === 0) return { sessionId: null, user: null }

    const session = sessions[0]
    // @ts-expect-error
    const user = session?.user

    return { sessionId: session?.id ?? null, user: user ?? null }
  }

  async create(userId: string, context: WabeContext<any>) {
    this.accessToken = jwt.sign(
      {
        userId,
        iat: Date.now(),
        exp: this.getAccessTokenExpireAt(context.wabe.config).getTime(),
      },
      import.meta.env.JWT_SECRET || 'dev',
    )

    this.refreshToken = jwt.sign(
      {
        userId,
        iat: Date.now(),
        exp: this.getRefreshTokenExpireAt(context.wabe.config).getTime(),
      },
      import.meta.env.JWT_SECRET || 'dev',
    )

    const res = await context.wabe.controllers.database.createObject({
      className: '_Session',
      context: contextWithRoot(context),
      data: {
        accessToken: this.accessToken,
        accessTokenExpiresAt: this.getAccessTokenExpireAt(context.wabe.config),

        refreshToken: this.refreshToken,
        refreshTokenExpiresAt: this.getRefreshTokenExpireAt(
          context.wabe.config,
        ),
        user: userId,
      },
      fields: ['id'],
    })

    if (!res) throw new Error('Session not created')

    return {
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      sessionId: res.id,
    }
  }

  async delete(context: WabeContext<any>) {
    if (!context.sessionId) return

    await context.wabe.controllers.database.deleteObject({
      className: '_Session',
      context: contextWithRoot(context),
      id: context.sessionId,
      fields: [],
    })
  }

  _isRefreshTokenExpired(
    userRefreshTokenExpiresAt: Date,
    refreshTokenAgeInMs: number,
  ) {
    const refreshTokenEmittedAt =
      userRefreshTokenExpiresAt.getTime() - refreshTokenAgeInMs
    const numberOfMsSinceRefreshTokenEmitted =
      Date.now() - refreshTokenEmittedAt

    return numberOfMsSinceRefreshTokenEmitted >= 0.75 * refreshTokenAgeInMs
  }

  async refresh(
    accessToken: string,
    refreshToken: string,
    context: WabeContext<any>,
  ) {
    const session = await context.wabe.controllers.database.getObjects({
      className: '_Session',
      where: {
        accessToken: { equalTo: accessToken },
      },
      fields: ['id', 'user', 'refreshToken', 'refreshTokenExpiresAt'],
      context: contextWithRoot(context),
    })

    if (!session.length)
      return {
        accessToken: null,
        refreshToken: null,
      }

    if (!session[0]) throw new Error('Session not found')

    const {
      refreshTokenExpiresAt,
      user,
      refreshToken: databaseRefreshToken,
      id,
    } = session[0]

    if (refreshTokenExpiresAt < new Date(Date.now()))
      throw new Error('Refresh token expired')

    const expiresInMs = this._getRefreshTokenExpiresInMs(context.wabe.config)

    // We refresh only if the refresh token is about to expire (75% of the time)
    if (!this._isRefreshTokenExpired(refreshTokenExpiresAt, expiresInMs))
      return {
        accessToken,
        refreshToken,
      }

    if (refreshToken !== databaseRefreshToken)
      throw new Error('Invalid refresh token')

    const userId = user?.id

    if (!userId)
      return {
        accessToken: null,
        refreshToken: null,
      }

    const newAccessToken = jwt.sign(
      {
        userId,
        iat: Date.now(),
        exp: this.getAccessTokenExpireAt(context.wabe.config).getTime(),
      },
      import.meta.env.JWT_SECRET || 'dev',
    )

    const newRefreshToken = jwt.sign(
      {
        userId,
        iat: Date.now(),
        exp: this.getRefreshTokenExpireAt(context.wabe.config).getTime(),
      },
      import.meta.env.JWT_SECRET || 'dev',
    )

    await context.wabe.controllers.database.updateObject({
      className: '_Session',
      context: contextWithRoot(context),
      id,
      data: {
        accessToken: newAccessToken,
        accessTokenExpiresAt: this.getAccessTokenExpireAt(context.wabe.config),
        refreshToken: newRefreshToken,
        refreshTokenExpiresAt: this.getRefreshTokenExpireAt(
          context.wabe.config,
        ),
      },
      fields: [],
    })

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    }
  }
}
