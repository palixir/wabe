import jwt from 'jsonwebtoken'
import { WibeApp } from '../server'
import type { Context } from '../graphql/interface'
import type { _Session, _User } from '../../generated/wibe'

export class Session {
	private accessToken: string | undefined = undefined
	private refreshToken: string | undefined = undefined

	async meFromAccessToken(
		accessToken: string,
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
				'refreshToken',
				'refreshTokenExpiresAt',
			],
		})

		const session = sessions[0]

		const user = session?.user

		return { sessionId: session?.id ?? null, user: user ?? null }
	}

	async create(userId: string, context: Context) {
		const fifteenMinutes = new Date(Date.now() + 1000 * 60 * 15)
		const thirtyDays = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)

		this.accessToken = jwt.sign(
			{
				userId,
				iat: Date.now(),
				exp: fifteenMinutes.getTime(),
			},
			import.meta.env.JWT_SECRET || 'dev',
		)

		this.refreshToken = jwt.sign(
			{
				userId,
				iat: Date.now(),
				exp: thirtyDays.getTime(),
			},
			import.meta.env.JWT_SECRET || 'dev',
		)

		const { id } = await WibeApp.databaseController.createObject({
			className: '_Session',
			context,
			data: {
				accessToken: this.accessToken,
				accessTokenExpiresAt: fifteenMinutes,
				refreshToken: this.refreshToken,
				refreshTokenExpiresAt: thirtyDays,
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

	async _rotateRefreshToken(context: Context) {
		const thirtyDays = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)

		this.refreshToken = jwt.sign(
			{
				userId: context.user.id,
				iat: Date.now(),
				exp: thirtyDays.getTime(),
			},
			import.meta.env.JWT_SECRET || 'dev',
		)

		WibeApp.databaseController.updateObject({
			className: '_Session',
			context,
			id: context.sessionId,
			data: {
				refreshToken: this.refreshToken,
				refreshTokenExpiresAt: thirtyDays,
			},
		})
	}

	async refreshWithSessionObject(session: _Session, context: Context) {
		if (session.refreshTokenExpiresAt < new Date())
			throw new Error('Refresh token has expired')

		const userId = session.user

		const fifteenMinutes = new Date(Date.now() + 1000 * 60 * 15)

		this.accessToken = jwt.sign(
			{
				userId,
				iat: Date.now(),
				exp: fifteenMinutes.getTime(),
			},
			import.meta.env.JWT_SECRET as string,
		)

		await WibeApp.databaseController.updateObject({
			className: '_Session',
			context,
			id: session.id,
			data: {
				accessToken: this.accessToken,
				accessTokenExpiresAt: fifteenMinutes,
			},
		})

		await this._rotateRefreshToken(context)

		return {
			accessToken: this.accessToken,
			refreshToken: this.refreshToken,
		}
	}

	async refresh(sessionId: string, context: Context) {
		const session = await WibeApp.databaseController.getObject({
			className: '_Session',
			id: sessionId,
			fields: ['user', 'refreshTokenExpiresAt'],
		})

		if (!session) throw new Error('Session not found')

		if (session.refreshTokenExpiresAt < new Date())
			throw new Error('Refresh token has expired')

		const userId = session.user

		const fifteenMinutes = new Date(Date.now() + 1000 * 60 * 15)

		this.accessToken = jwt.sign(
			{
				userId,
				iat: Date.now(),
				exp: fifteenMinutes.getTime(),
			},
			import.meta.env.JWT_SECRET as string,
		)

		await WibeApp.databaseController.updateObject({
			className: '_Session',
			context,
			id: sessionId,
			data: {
				accessToken: this.accessToken,
				accessTokenExpiresAt: fifteenMinutes,
			},
		})

		await this._rotateRefreshToken(context)

		return {
			accessToken: this.accessToken,
			refreshToken: this.refreshToken,
		}
	}
}
