import jwt from 'jsonwebtoken'
import type { WibeContext } from '../server/interface'
import type { _Session, User } from '../../generated/wibe'
import type { WibeConfig } from '../server'

export class Session {
	private accessToken: string | undefined = undefined
	private refreshToken: string | undefined = undefined

	getAccessTokenExpireIn(config: WibeConfig<any>) {
		const customExpiresIn =
			config?.authentication?.session?.accessTokenExpiresIn

		if (!customExpiresIn) return 1000 * 60 * 15 // 15 minutes in ms

		return customExpiresIn
	}

	getRefreshTokenExpireIn(config: WibeConfig<any>) {
		const customExpiresIn =
			config?.authentication?.session?.refreshTokenExpiresIn

		if (!customExpiresIn) return 1000 * 60 * 60 * 24 * 30 // 30 days in ms

		return customExpiresIn
	}

	async meFromAccessToken(
		accessToken: string,
		context: WibeContext<any>,
	): Promise<{ sessionId: string; user: User | null }> {
		const sessions = await context.wibe.databaseController.getObjects({
			className: '_Session',
			where: {
				accessToken: { equalTo: accessToken },
			},
			limit: 1,
			fields: [
				'id',
				'user.id',
				'user.email',
				'user.role.name',
				'user.role.id',
				'refreshToken',
				'refreshTokenExpiresAt',
			],
			context,
		})

		const session = sessions[0]

		// @ts-expect-error
		const user = session?.user

		return { sessionId: session?.id ?? null, user: user ?? null }
	}

	async create(userId: string, context: WibeContext<any>) {
		this.accessToken = jwt.sign(
			{
				userId,
				iat: Date.now(),
				exp:
					Date.now() +
					this.getAccessTokenExpireIn(context.wibe.config),
			},
			import.meta.env.JWT_SECRET || 'dev',
		)

		this.refreshToken = jwt.sign(
			{
				userId,
				iat: Date.now(),
				exp:
					Date.now() +
					this.getRefreshTokenExpireIn(context.wibe.config),
			},
			import.meta.env.JWT_SECRET || 'dev',
		)

		const { id } = await context.wibe.databaseController.createObject({
			className: '_Session',
			context,
			data: {
				accessToken: this.accessToken,
				accessTokenExpiresAt: new Date(
					Date.now() +
						this.getAccessTokenExpireIn(context.wibe.config),
				),
				refreshToken: this.refreshToken,
				refreshTokenExpiresAt: new Date(
					Date.now() +
						this.getRefreshTokenExpireIn(context.wibe.config),
				),
				user: userId,
			},
			fields: ['id'],
		})

		return {
			accessToken: this.accessToken,
			refreshToken: this.refreshToken,
			sessionId: id,
		}
	}

	async delete(context: WibeContext<any>) {
		if (!context.sessionId) return

		await context.wibe.databaseController.deleteObject({
			className: '_Session',
			context,
			id: context.sessionId,
			fields: [],
		})
	}

	async refresh(
		accessToken: string,
		refreshToken: string,
		context: WibeContext<any>,
	) {
		const session = await context.wibe.databaseController.getObjects({
			className: '_Session',
			where: {
				accessToken: { equalTo: accessToken },
			},
			fields: ['id', 'user', 'refreshToken', 'refreshTokenExpiresAt'],
			context: {
				...context,
				isRoot: true,
			},
		})

		if (!session.length) throw new Error('Session not found')

		const {
			refreshTokenExpiresAt,
			user,
			refreshToken: databaseRefreshToken,
			id,
		} = session[0]

		if (refreshTokenExpiresAt < new Date(Date.now()))
			throw new Error('Refresh token expired')

		const refreshTokenExpireIn = this.getRefreshTokenExpireIn(
			context.wibe.config,
		)

		// We refresh only if the refresh token is about to expire (75% of the time)
		if (
			refreshTokenExpiresAt.getTime() - Date.now() <
			0.75 * refreshTokenExpireIn
		)
			return {
				accessToken,
				refreshToken,
			}

		if (refreshToken !== databaseRefreshToken)
			throw new Error('Invalid refresh token')

		const newAccessToken = jwt.sign(
			{
				userId: user?.id,
				iat: Date.now(),
				exp: this.getAccessTokenExpireIn(context.wibe.config),
			},
			import.meta.env.JWT_SECRET || 'dev',
		)

		const newRefreshToken = jwt.sign(
			{
				userId: user?.id,
				iat: Date.now(),
				exp: this.getRefreshTokenExpireIn(context.wibe.config),
			},
			import.meta.env.JWT_SECRET || 'dev',
		)

		await context.wibe.databaseController.updateObject({
			className: '_Session',
			context: {
				...context,
				isRoot: true,
			},
			id,
			data: {
				accessToken: newAccessToken,
				accessTokenExpiresAt: new Date(
					Date.now() +
						this.getAccessTokenExpireIn(context.wibe.config),
				),
				refreshToken: newRefreshToken,
				refreshTokenExpiresAt: new Date(
					Date.now() +
						this.getRefreshTokenExpireIn(context.wibe.config),
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
