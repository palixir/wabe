import jwt from 'jsonwebtoken'
import type { WabeContext } from '../server/interface'
import type { User } from '../../generated/wabe'
import type { WabeConfig } from '../server'
import { contextWithRoot } from '../utils/export'
import type { DevWabeTypes } from '../utils/helper'

export class Session {
  private accessToken: string | undefined = undefined
  private refreshToken: string | undefined = undefined

  getAccessTokenExpireAt(config: WabeConfig<DevWabeTypes>) {
    const customExpiresInMs =
      config?.authentication?.session?.accessTokenExpiresInMs

    if (!customExpiresInMs) return new Date(Date.now() + 1000 * 60 * 15) // 15 minutes in ms

    return new Date(Date.now() + customExpiresInMs)
  }

  _getRefreshTokenExpiresInMs(config: WabeConfig<DevWabeTypes>) {
    const customExpiresInMs =
      config?.authentication?.session?.refreshTokenExpiresInMs

    if (!customExpiresInMs) return 1000 * 60 * 60 * 24 * 30 // 30 days in ms

    return customExpiresInMs
  }

  getRefreshTokenExpireAt(config: WabeConfig<DevWabeTypes>) {
    const expiresInMs = this._getRefreshTokenExpiresInMs(config)

    return new Date(Date.now() + expiresInMs)
  }

  async meFromAccessToken(
    accessToken: string,
    context: WabeContext<DevWabeTypes>,
  ): Promise<{ sessionId: string | null; user: User | null }> {
    const sessions = await context.wabe.controllers.database.getObjects({
      className: '_Session',
      where: {
        accessToken: { equalTo: accessToken },
      },
      select: {
        id: true,
        user: true,
      },
      first: 1,
      context,
    })

    if (sessions.length === 0) return { sessionId: null, user: null }

    const session = sessions[0]

    const user = session?.user

    if (!user) return { sessionId: session?.id ?? null, user: null }

    const userWithRole = await context.wabe.controllers.database.getObject({
      className: 'User',
      select: {
        role: true,
      },
      context,
      id: user.id,
    })

    return {
      sessionId: session?.id ?? null,
      user: {
        ...user,
        role: userWithRole?.role,
      },
    }
  }

  async create(userId: string, context: WabeContext<DevWabeTypes>) {
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
      select: { id: true },
    })

    if (!res) throw new Error('Session not created')

    return {
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      sessionId: res.id,
    }
  }

  async delete(context: WabeContext<DevWabeTypes>) {
    if (!context.sessionId) return

    await context.wabe.controllers.database.deleteObject({
      className: '_Session',
      context: contextWithRoot(context),
      id: context.sessionId,
      select: {},
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
    context: WabeContext<DevWabeTypes>,
  ) {
    const session = await context.wabe.controllers.database.getObjects({
      className: '_Session',
      where: {
        accessToken: { equalTo: accessToken },
      },
      select: {
        id: true,
        user: {
          id: true,
          role: {
            id: true,
            name: true,
          },
        },
        refreshToken: true,
        refreshTokenExpiresAt: true,
      },
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

    if (new Date(refreshTokenExpiresAt) < new Date(Date.now()))
      throw new Error('Refresh token expired')

    const expiresInMs = this._getRefreshTokenExpiresInMs(context.wabe.config)

    // We refresh only if the refresh token is about to expire (75% of the time)
    if (
      !this._isRefreshTokenExpired(new Date(refreshTokenExpiresAt), expiresInMs)
    )
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
      select: {},
    })

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    }
  }
}
