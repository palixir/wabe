import jwt from 'jsonwebtoken'
import { WibeApp } from '../server'
import type { Context } from '../graphql/interface'
import type { _Session, _User } from '../../generated/wibe'

export class Session {
	private accessToken: string | undefined = undefined
	private refreshToken: string | undefined = undefined

	getAccessTokenExpireIn() {
		const customExpiresIn =
			WibeApp.config?.authentication?.session?.accessTokenExpiresIn

		if (!customExpiresIn) return 1000 * 60 * 15 // 15 minutes in ms

		return customExpiresIn
	}

	getRefreshTokenExpireIn() {
		const customExpiresIn =
			WibeApp.config?.authentication?.session?.refreshTokenExpiresIn

		if (!customExpiresIn) return 1000 * 60 * 60 * 24 * 30 // 30 days in ms

		return customExpiresIn
	}

	async meFromAccessToken(
		accessToken: string,
		context: Context,
	): Promise<{ sessionId: string; user: _User | null }> {
		const sessions = await WibeApp.databaseController.getObjects({
			className: '_Session',
			where: {
				accessToken: { equalTo: accessToken },
			},
			limit: 1,
			fields: [
				'id',
				// @ts-expect-error
				'user.id',
				// @ts-expect-error
				'user.email',
				'user.role.name',
				'refreshToken',
				'refreshTokenExpiresAt',
			],
			context,
		})

		const session = sessions[0]

		const user = session?.user

		return { sessionId: session?.id ?? null, user: user ?? null }
	}

	async create(userId: string, context: Context) {
		this.accessToken = jwt.sign(
			{
				userId,
				iat: Date.now(),
				exp: Date.now() + this.getAccessTokenExpireIn(),
			},
			import.meta.env.JWT_SECRET || 'dev',
		)

		this.refreshToken = jwt.sign(
			{
				userId,
				iat: Date.now(),
				exp: Date.now() + this.getRefreshTokenExpireIn(),
			},
			import.meta.env.JWT_SECRET || 'dev',
		)

		const { id } = await WibeApp.databaseController.createObject({
			className: '_Session',
			context,
			data: {
				accessToken: this.accessToken,
				accessTokenExpiresAt: new Date(
					Date.now() + this.getAccessTokenExpireIn(),
				),
				refreshToken: this.refreshToken,
				refreshTokenExpiresAt: new Date(
					Date.now() + this.getRefreshTokenExpireIn(),
				),
				user: userId,
			},
		})

		return {
			accessToken: this.accessToken,
			refreshToken: this.refreshToken,
			sessionId: id,
		}
	}

	async delete(context: Context) {
		await WibeApp.databaseController.deleteObject({
			className: '_Session',
			context,
			id: context.sessionId,
		})
	}

	async refresh(accessToken: string, refreshToken: string, context: Context) {
		const session = await WibeApp.databaseController.getObjects({
			className: '_Session',
			where: {
				accessToken: { equalTo: accessToken },
			},
			fields: ['id', 'user', 'refreshToken', 'refreshTokenExpiresAt'],
			context,
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

		const refreshTokenExpireIn = this.getRefreshTokenExpireIn()

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
				exp: this.getAccessTokenExpireIn(),
			},
			import.meta.env.JWT_SECRET || 'dev',
		)

		const newRefreshToken = jwt.sign(
			{
				userId: user?.id,
				iat: Date.now(),
				exp: this.getRefreshTokenExpireIn(),
			},
			import.meta.env.JWT_SECRET || 'dev',
		)

		await WibeApp.databaseController.updateObject({
			className: '_Session',
			context,
			id,
			data: {
				accessToken: newAccessToken,
				accessTokenExpiresAt: new Date(
					Date.now() + this.getAccessTokenExpireIn(),
				),
				refreshToken: newRefreshToken,
				refreshTokenExpiresAt: new Date(
					Date.now() + this.getRefreshTokenExpireIn(),
				),
			},
		})

		return {
			accessToken: newAccessToken,
			refreshToken: newRefreshToken,
		}
	}
}
