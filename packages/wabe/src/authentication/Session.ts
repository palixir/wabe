import jwt, { verify, type SignOptions } from 'jsonwebtoken'
import crypto from 'node:crypto'
import type { WabeContext } from '../server/interface'
import type { WabeConfig, WabeTypes } from '../server'
import { contextWithRoot } from '../utils/export'
import { encryptDeterministicToken, decryptDeterministicToken } from '../utils/crypto'

const getJwtSecret = <T extends WabeTypes>(context: WabeContext<T>): string => {
	const secret = context.wabe.config.authentication?.session?.jwtSecret
	if (!secret) throw new Error('Authentication session requires jwtSecret')
	return secret
}

const JWT_ALGORITHM = 'HS256'

const safeVerify = (
	token: string,
	secret: string,
	options: Pick<SignOptions, 'audience' | 'issuer'> = {},
) => {
	try {
		return !!verify(token, secret, {
			...options,
			algorithms: [JWT_ALGORITHM],
		})
	} catch {
		return false
	}
}

const getTokenSecret = <T extends WabeTypes>(context: WabeContext<T>): string =>
	context.wabe.config.authentication?.session?.tokenSecret ?? getJwtSecret(context)

const getTokenEncryptionKey = <T extends WabeTypes>(context: WabeContext<T>) =>
	crypto.createHash('sha256').update(getTokenSecret(context)).digest()

const getJwtVerifyOptions = <T extends WabeTypes>(context: WabeContext<T>) => {
	const opts: Pick<SignOptions, 'audience' | 'issuer'> = {}
	const audience = context.wabe.config.authentication?.session?.jwtAudience
	const issuer = context.wabe.config.authentication?.session?.jwtIssuer
	if (audience) opts.audience = audience
	if (issuer) opts.issuer = issuer
	return opts
}

export class Session<T extends WabeTypes> {
	private accessToken: string | undefined = undefined
	private refreshToken: string | undefined = undefined

	getAccessTokenExpireAt(config: WabeConfig<T>) {
		const customExpiresInMs = config?.authentication?.session?.accessTokenExpiresInMs

		if (!customExpiresInMs) return new Date(Date.now() + 1000 * 60 * 15) // 15 minutes in ms

		return new Date(Date.now() + customExpiresInMs)
	}

	_getRefreshTokenExpiresInMs(config: WabeConfig<T>) {
		const customExpiresInMs = config?.authentication?.session?.refreshTokenExpiresInMs

		if (!customExpiresInMs) return 1000 * 60 * 60 * 24 * 7 // 7 days in ms

		return customExpiresInMs
	}

	getRefreshTokenExpireAt(config: WabeConfig<T>) {
		const expiresInMs = this._getRefreshTokenExpiresInMs(config)

		return new Date(Date.now() + expiresInMs)
	}

	async meFromAccessToken(
		{ accessToken, csrfToken }: { accessToken: string; csrfToken: string },
		context: WabeContext<T>,
	): Promise<{
		sessionId: string | null
		user: T['types']['User'] | null
		accessToken: string | null
		refreshToken?: string | null
	}> {
		const verifyOptions = getJwtVerifyOptions(context)
		if (!safeVerify(accessToken, getJwtSecret(context), verifyOptions)) {
			return {
				sessionId: null,
				user: null,
				accessToken: null,
				refreshToken: null,
			}
		}

		const encryptedAccessToken = encryptDeterministicToken(
			accessToken,
			getTokenEncryptionKey(context),
		)

		const sessions = await context.wabe.controllers.database.getObjects({
			className: '_Session',
			// @ts-expect-error
			where: {
				accessTokenEncrypted: { equalTo: encryptedAccessToken },
				OR: [
					{
						accessTokenExpiresAt: {
							greaterThanOrEqualTo: new Date(),
						},
					},
					{
						refreshTokenExpiresAt: {
							greaterThanOrEqualTo: new Date(),
						},
					},
				],
			},
			select: {
				// @ts-expect-error
				id: true,
				// @ts-expect-error Generic
				user: true,
				// @ts-expect-error Generic
				accessTokenExpiresAt: true,
				// @ts-expect-error Generic
				refreshTokenExpiresAt: true,
				// @ts-expect-error Generic
				refreshTokenEncrypted: true,
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

		// CSRF check only for cookie-based sessions (enabled by default unless explicitly disabled)
		if (
			context.wabe.config.authentication?.session?.cookieSession &&
			context.wabe.config.security?.disableCSRFProtection !== true
		) {
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

			const csrfSecret =
				context.wabe.config.authentication?.session?.csrfSecret || getJwtSecret(context)

			const expectedHmac = crypto.createHmac('sha256', csrfSecret).update(message).digest('hex')

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
				// @ts-expect-error
				role: true,
			},
			context,
			id: user.id,
		})

		// If access token is expired and refresh token is not expired
		if (
			new Date(session.accessTokenExpiresAt) < new Date() &&
			new Date(session.refreshTokenExpiresAt) >= new Date() &&
			session.refreshTokenEncrypted
		) {
			const decryptedRefreshToken = decryptDeterministicToken(
				session.refreshTokenEncrypted as string,
				getTokenEncryptionKey(context),
			)

			if (!decryptedRefreshToken)
				return {
					sessionId: null,
					user: null,
					accessToken: null,
					refreshToken: null,
				}

			const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await this.refresh(
				accessToken,
				decryptedRefreshToken,
				context,
			)

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
			refreshToken: decryptDeterministicToken(
				session.refreshTokenEncrypted as string,
				getTokenEncryptionKey(context),
			),
		}
	}

	async create(userId: string, context: WabeContext<T>) {
		const jwtTokenFields = context.wabe.config.authentication?.session?.jwtTokenFields

		const nowSeconds = Math.floor(Date.now() / 1000)

		const result = jwtTokenFields
			? await context.wabe.controllers.database.getObject({
					className: 'User',
					select: jwtTokenFields,
					context,
					id: userId,
				})
			: undefined

		const secretKey = getJwtSecret(context)

		const signOptions: SignOptions = {
			jwtid: crypto.randomUUID(),
			algorithm: JWT_ALGORITHM,
		}
		const audience = context.wabe.config.authentication?.session?.jwtAudience
		const issuer = context.wabe.config.authentication?.session?.jwtIssuer
		if (audience) signOptions.audience = audience
		if (issuer) signOptions.issuer = issuer

		this.accessToken = jwt.sign(
			{
				userId,
				user: result,
				iat: nowSeconds,
				exp: Math.floor(this.getAccessTokenExpireAt(context.wabe.config).getTime() / 1000),
			},
			secretKey,
			{ ...signOptions, algorithm: JWT_ALGORITHM },
		)

		this.refreshToken = jwt.sign(
			{
				userId,
				user: result,
				iat: nowSeconds,
				exp: Math.floor(this.getRefreshTokenExpireAt(context.wabe.config).getTime() / 1000),
			},
			secretKey,
			{ ...signOptions, algorithm: JWT_ALGORITHM },
		)

		const accessTokenEncrypted = encryptDeterministicToken(
			this.accessToken,
			getTokenEncryptionKey(context),
		)
		const refreshTokenEncrypted = encryptDeterministicToken(
			this.refreshToken,
			getTokenEncryptionKey(context),
		)

		const res = await context.wabe.controllers.database.createObject({
			className: '_Session',
			context: contextWithRoot(context),
			data: {
				accessTokenEncrypted,
				accessTokenExpiresAt: this.getAccessTokenExpireAt(context.wabe.config),
				refreshTokenEncrypted,
				refreshTokenExpiresAt: this.getRefreshTokenExpireAt(context.wabe.config),
				user: userId,
			},
			// @ts-expect-error
			select: { id: true },
		})

		if (!res) throw new Error('Session not created')

		const sessionId = res.id
		const randomValue = crypto.randomBytes(16).toString('hex')
		const message = `${sessionId.length}!${sessionId}!${randomValue.length}!${randomValue}`

		const csrfSecret = context.wabe.config.authentication?.session?.csrfSecret || secretKey

		const hmac = crypto.createHmac('sha256', csrfSecret).update(message).digest('hex')

		const csrfToken = `${hmac}.${randomValue}`

		return {
			accessToken: this.accessToken,
			refreshToken: this.refreshToken,
			csrfToken,
			sessionId: res.id,
		}
	}

	async refresh(accessToken: string, refreshToken: string, context: WabeContext<T>) {
		const secretKey = getJwtSecret(context)

		const verifyOptions = getJwtVerifyOptions(context)

		if (!safeVerify(accessToken, secretKey, verifyOptions))
			return {
				accessToken: null,
				refreshToken: null,
			}

		if (!safeVerify(refreshToken, secretKey, verifyOptions))
			return {
				accessToken: null,
				refreshToken: null,
			}

		const accessTokenEncrypted = encryptDeterministicToken(
			accessToken,
			getTokenEncryptionKey(context),
		)
		const incomingRefreshTokenEncrypted = encryptDeterministicToken(
			refreshToken,
			getTokenEncryptionKey(context),
		)

		const session = await context.wabe.controllers.database.getObjects({
			className: '_Session',
			// @ts-expect-error
			where: {
				accessTokenEncrypted: { equalTo: accessTokenEncrypted },
				refreshTokenEncrypted: {
					equalTo: incomingRefreshTokenEncrypted,
				},
			},
			select: {
				// @ts-expect-error
				id: true,
				// @ts-expect-error
				user: {
					id: true,
					role: {
						id: true,
						name: true,
					},
				},
				// @ts-expect-error
				refreshTokenEncrypted: true,
				// @ts-expect-error
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
			refreshTokenEncrypted: storedRefreshTokenEncrypted,
			id,
		} = session[0]

		if (new Date(refreshTokenExpiresAt) < new Date(Date.now()))
			throw new Error('Refresh token expired')

		const decryptedRefreshToken =
			decryptDeterministicToken(storedRefreshTokenEncrypted, getTokenEncryptionKey(context)) ||
			refreshToken

		if (!decryptedRefreshToken || decryptedRefreshToken !== refreshToken)
			throw new Error('Invalid refresh token')

		// Always rotate tokens on refresh
		const userId = user?.id

		if (!userId)
			return {
				accessToken: null,
				refreshToken: null,
			}

		const jwtTokenFields = context.wabe.config.authentication?.session?.jwtTokenFields

		const result = jwtTokenFields
			? await context.wabe.controllers.database.getObject({
					className: 'User',
					select: jwtTokenFields,
					context,
					id: userId,
				})
			: undefined

		const nowSeconds = Math.floor(Date.now() / 1000)

		const signOptions: SignOptions = {
			jwtid: crypto.randomUUID(),
			algorithm: JWT_ALGORITHM,
		}
		const audience = context.wabe.config.authentication?.session?.jwtAudience
		const issuer = context.wabe.config.authentication?.session?.jwtIssuer
		if (audience) signOptions.audience = audience
		if (issuer) signOptions.issuer = issuer

		const newAccessToken = jwt.sign(
			{
				userId,
				user: result,
				iat: nowSeconds,
				exp: Math.floor(this.getAccessTokenExpireAt(context.wabe.config).getTime() / 1000),
			},
			secretKey,
			{ ...signOptions, algorithm: JWT_ALGORITHM },
		)

		const newRefreshToken = jwt.sign(
			{
				userId,
				user: result,
				iat: nowSeconds,
				exp: Math.floor(this.getRefreshTokenExpireAt(context.wabe.config).getTime() / 1000),
			},
			secretKey,
			{ ...signOptions, algorithm: JWT_ALGORITHM },
		)

		const newAccessTokenEncrypted = encryptDeterministicToken(
			newAccessToken,
			getTokenEncryptionKey(context),
		)
		const newRefreshTokenEncrypted = encryptDeterministicToken(
			newRefreshToken,
			getTokenEncryptionKey(context),
		)

		await context.wabe.controllers.database.updateObject({
			className: '_Session',
			context: contextWithRoot(context),
			id,
			data: {
				accessTokenEncrypted: newAccessTokenEncrypted,
				accessTokenExpiresAt: this.getAccessTokenExpireAt(context.wabe.config),
				refreshTokenEncrypted: newRefreshTokenEncrypted,
				refreshTokenExpiresAt: this.getRefreshTokenExpireAt(context.wabe.config),
			},
			select: {},
		})

		return {
			accessToken: newAccessToken,
			refreshToken: newRefreshToken,
		}
	}

	async delete(context: WabeContext<T>) {
		if (!context.sessionId) return

		await context.wabe.controllers.database.deleteObject({
			className: '_Session',
			context: contextWithRoot(context),
			id: context.sessionId,
			select: {},
		})
	}

	_isRefreshTokenExpired(userRefreshTokenExpiresAt: Date, refreshTokenAgeInMs: number) {
		const refreshTokenEmittedAt = userRefreshTokenExpiresAt.getTime() - refreshTokenAgeInMs
		const numberOfMsSinceRefreshTokenEmitted = Date.now() - refreshTokenEmittedAt

		return numberOfMsSinceRefreshTokenEmitted >= 0.75 * refreshTokenAgeInMs
	}
}
