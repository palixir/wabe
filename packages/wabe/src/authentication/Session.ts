import jwt, { verify } from 'jsonwebtoken'
import crypto from 'node:crypto'
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
		{ accessToken, csrfToken }: { accessToken: string; csrfToken: string },
		context: WabeContext<DevWabeTypes>,
	): Promise<{
		sessionId: string | null
		user: User | null
		accessToken: string | null
		refreshToken?: string | null
	}> {
		if (
			!verify(
				accessToken,
				context.wabe.config.authentication?.session?.jwtSecret || 'dev',
				{},
			)
		) {
			return {
				sessionId: null,
				user: null,
				accessToken: null,
				refreshToken: null,
			}
		}

		const sessions = await context.wabe.controllers.database.getObjects({
			className: '_Session',
			where: {
				accessToken: { equalTo: accessToken },
				OR: [
					{
						accessTokenExpiresAt: { greaterThanOrEqualTo: new Date() },
					},
					{
						refreshTokenExpiresAt: { greaterThanOrEqualTo: new Date() },
					},
				],
			},
			select: {
				id: true,
				user: true,
				accessTokenExpiresAt: true,
				refreshTokenExpiresAt: true,
				refreshToken: true,
			},
			first: 1,
			context,
		})

		if (sessions.length === 0)
			return {
				sessionId: null,
				user: null,
				accessToken: null,
				refreshToken: null,
			}

		const session = sessions[0]

		if (!session || !session?.user)
			return {
				sessionId: null,
				user: null,
				accessToken: null,
				refreshToken: null,
			}

		// CSRF check
		if (context.wabe.config.security?.csrfProtection) {
			const secretKey =
				context.wabe.config.authentication?.session?.jwtSecret || 'dev'

			const [receivedHmacHex, receivedRandomValue] = csrfToken.split('.')

			if (!receivedHmacHex || !receivedRandomValue)
				return {
					sessionId: null,
					user: null,
					accessToken: null,
					refreshToken: null,
				}

			const currentSessionId = session.id

			const message = `${currentSessionId.length}!${currentSessionId}!${receivedRandomValue?.length}!${receivedRandomValue}`

			const expectedHmac = crypto
				.createHmac('sha256', secretKey)
				.update(message)
				.digest('hex')

			const isValid = crypto.timingSafeEqual(
				Buffer.from(receivedHmacHex || '', 'hex'),
				Buffer.from(expectedHmac, 'hex'),
			)

			if (!isValid)
				return {
					sessionId: null,
					user: null,
					accessToken: null,
					refreshToken: null,
				}
		}

		// User check

		const user = session.user

		const userWithRole = await context.wabe.controllers.database.getObject({
			className: 'User',
			select: {
				role: true,
			},
			context,
			id: user.id,
		})

		// If access token is expired and refresh token is not expired
		if (
			new Date(session.accessTokenExpiresAt) < new Date() &&
			new Date(session.refreshTokenExpiresAt) >= new Date() &&
			session.refreshToken
		) {
			const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
				await this.refresh(accessToken, session.refreshToken, context)

			return {
				sessionId: session.id,
				user: {
					...user,
					role: userWithRole?.role,
				},
				accessToken: newAccessToken,
				refreshToken: newRefreshToken,
			}
		}

		return {
			sessionId: session.id,
			user: {
				...user,
				role: userWithRole?.role,
			},
			accessToken,
			refreshToken: session.refreshToken,
		}
	}

	async create(userId: string, context: WabeContext<DevWabeTypes>) {
		const jwtTokenFields =
			context.wabe.config.authentication?.session?.jwtTokenFields

		const result = jwtTokenFields
			? await context.wabe.controllers.database.getObject({
					className: 'User',
					select: jwtTokenFields,
					context,
					id: userId,
				})
			: undefined

		const secretKey =
			context.wabe.config.authentication?.session?.jwtSecret || 'dev'

		this.accessToken = jwt.sign(
			{
				userId,
				user: result,
				iat: Date.now(),
				exp: this.getAccessTokenExpireAt(context.wabe.config).getTime(),
			},
			secretKey,
		)

		this.refreshToken = jwt.sign(
			{
				userId,
				user: result,
				iat: Date.now(),
				exp: this.getRefreshTokenExpireAt(context.wabe.config).getTime(),
			},
			secretKey,
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

		const sessionId = res.id
		const randomValue = crypto.randomBytes(16).toString('hex')
		const message = `${sessionId.length}!${sessionId}!${randomValue.length}!${randomValue}`

		const hmac = crypto
			.createHmac('sha256', secretKey)
			.update(message)
			.digest('hex')

		const csrfToken = `${hmac}.${randomValue}`

		return {
			accessToken: this.accessToken,
			refreshToken: this.refreshToken,
			csrfToken,
			sessionId: res.id,
		}
	}

	async refresh(
		accessToken: string,
		refreshToken: string,
		context: WabeContext<DevWabeTypes>,
	) {
		if (
			!verify(
				accessToken,
				context.wabe.config.authentication?.session?.jwtSecret || 'dev',
				{},
			)
		)
			return {
				accessToken: null,
				refreshToken: null,
			}

		if (
			!verify(
				refreshToken,
				context.wabe.config.authentication?.session?.jwtSecret || 'dev',
				{},
			)
		)
			return {
				accessToken: null,
				refreshToken: null,
			}

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

		const jwtTokenFields =
			context.wabe.config.authentication?.session?.jwtTokenFields

		const result = jwtTokenFields
			? await context.wabe.controllers.database.getObject({
					className: 'User',
					select: jwtTokenFields,
					context,
					id: userId,
				})
			: undefined

		const newAccessToken = jwt.sign(
			{
				userId,
				user: result,
				iat: Date.now(),
				exp: this.getAccessTokenExpireAt(context.wabe.config).getTime(),
			},
			context.wabe.config.authentication?.session?.jwtSecret || 'dev',
		)

		const newRefreshToken = jwt.sign(
			{
				userId,
				user: result,
				iat: Date.now(),
				exp: this.getRefreshTokenExpireAt(context.wabe.config).getTime(),
			},
			context.wabe.config.authentication?.session?.jwtSecret || 'dev',
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
}
