import jwt from 'jsonwebtoken'
import type { WabeContext } from '../server/interface'
import type { _Session, User } from '../../generated/wabe'
import type { WabeConfig } from '../server'

export class Session {
	private accessToken: string | undefined = undefined
	private refreshToken: string | undefined = undefined

	getAccessTokenExpireAt(config: WabeConfig<any>) {
		const customExpiresIn =
			config?.authentication?.session?.accessTokenExpiresIn

		if (!customExpiresIn) return new Date(Date.now() + 1000 * 60 * 15) // 15 minutes in ms

		return new Date(Date.now() + customExpiresIn)
	}

	getRefreshTokenExpireAt(config: WabeConfig<any>) {
		const customExpiresIn =
			config?.authentication?.session?.refreshTokenExpiresIn

		if (!customExpiresIn)
			return new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) // 30 days in ms

		return new Date(Date.now() + customExpiresIn)
	}

	async meFromAccessToken(
		accessToken: string,
		context: WabeContext<any>,
	): Promise<{ sessionId: string; user: User | null }> {
		const sessions = await context.wabe.controllers.database.getObjects({
			className: '_Session',
			where: {
				accessToken: { equalTo: accessToken },
			},
			first: 1,
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
				exp: this.getRefreshTokenExpireAt(
					context.wabe.config,
				).getTime(),
			},
			import.meta.env.JWT_SECRET || 'dev',
		)

		const { id } = await context.wabe.controllers.database.createObject({
			className: '_Session',
			context,
			data: {
				accessToken: this.accessToken,
				accessTokenExpiresAt: this.getAccessTokenExpireAt(
					context.wabe.config,
				),

				refreshToken: this.refreshToken,
				refreshTokenExpiresAt: this.getRefreshTokenExpireAt(
					context.wabe.config,
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

	async delete(context: WabeContext<any>) {
		if (!context.sessionId) return

		await context.wabe.controllers.database.deleteObject({
			className: '_Session',
			context,
			id: context.sessionId,
			fields: [],
		})
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

		const refreshTokenExpireIn = this.getRefreshTokenExpireAt(
			context.wabe.config,
		).getTime()

		// We refresh only if the refresh token is about to expire (75% of the time)
		if (
			refreshTokenExpiresAt.getTime() - Date.now() <
			0.75 * (refreshTokenExpireIn - Date.now())
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
				exp: this.getAccessTokenExpireAt(context.wabe.config).getTime(),
			},
			import.meta.env.JWT_SECRET || 'dev',
		)

		const newRefreshToken = jwt.sign(
			{
				userId: user?.id,
				iat: Date.now(),
				exp: this.getRefreshTokenExpireAt(
					context.wabe.config,
				).getTime(),
			},
			import.meta.env.JWT_SECRET || 'dev',
		)

		await context.wabe.controllers.database.updateObject({
			className: '_Session',
			context: {
				...context,
				isRoot: true,
			},
			id,
			data: {
				accessToken: newAccessToken,
				accessTokenExpiresAt: this.getAccessTokenExpireAt(
					context.wabe.config,
				),

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
