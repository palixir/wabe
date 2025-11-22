import { describe, expect, it, mock, beforeEach } from 'bun:test'
import { fail } from 'node:assert'
import jwt, { type JwtPayload } from 'jsonwebtoken'
import { Session } from './Session'

describe('Session', () => {
	const mockGetObject = mock(() => Promise.resolve({}) as any)
	const mockGetObjects = mock(() => Promise.resolve([]) as any)
	const mockCreateObject = mock(() => Promise.resolve({ id: 'userId' })) as any
	const mockDeleteObject = mock(() => Promise.resolve()) as any
	const mockUpdateObject = mock(() => Promise.resolve()) as any

	const controllers = {
		database: {
			getObject: mockGetObject,
			getObjects: mockGetObjects,
			createObject: mockCreateObject,
			deleteObject: mockDeleteObject,
			updateObject: mockUpdateObject,
		},
	}

	beforeEach(() => {
		mockGetObject.mockClear()
		mockGetObjects.mockClear()
		mockCreateObject.mockClear()
		mockDeleteObject.mockClear()
		mockUpdateObject.mockClear()
	})

	const context = {
		isRoot: true,
		wabe: {
			controllers,
			config: { authentication: { session: { jwtSecret: 'dev' } } },
		},
	} as any

	it('should set all data set in the jwtTokenFields on create session', async () => {
		mockGetObject.mockResolvedValueOnce({
			id: 'userId',
			email: 'user@email.com',
		})

		const session = new Session()

		const jwtTokenFields = {
			id: true,
			email: true,
		}

		const { accessToken, refreshToken } = await session.create('userId', {
			isRoot: true,
			wabe: {
				controllers,
				config: {
					authentication: {
						session: {
							jwtSecret: 'dev',
							jwtTokenFields,
						},
					},
				},
			},
		} as any)

		const decodedAccessToken = jwt.decode(accessToken) as JwtPayload
		const decodedRefreshToken = jwt.decode(refreshToken) as JwtPayload

		expect(decodedAccessToken.user).toEqual({
			id: 'userId',
			email: 'user@email.com',
		})

		expect(decodedRefreshToken.user).toEqual({
			id: 'userId',
			email: 'user@email.com',
		})
	})

	it('should set all data set in the jwtTokenFields on refresh session', async () => {
		const session = new Session()

		const { accessToken: oldAccessToken, refreshToken: oldRefreshToken } =
			await session.create('userId', context)

		mockGetObjects.mockResolvedValue([
			{
				id: 'sessionId',
				refreshToken: oldRefreshToken,
				refreshTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
				user: {
					id: 'userId',
					email: 'userEmail',
				},
			},
		])
		mockGetObject.mockResolvedValue({
			id: 'userId',
			email: 'user@email.com',
		})

		const jwtTokenFields = {
			id: true,
			email: true,
		}

		const { accessToken, refreshToken } = await session.refresh(
			oldAccessToken,
			oldRefreshToken,
			{
				isRoot: true,
				wabe: {
					controllers,
					config: {
						authentication: {
							session: {
								jwtSecret: 'dev',
								jwtTokenFields,
							},
						},
					},
				},
			} as any,
		)

		if (!accessToken || !refreshToken) fail()

		const decodedAccessToken = jwt.decode(accessToken) as JwtPayload
		const decodedRefreshToken = jwt.decode(refreshToken) as JwtPayload

		expect(decodedAccessToken.user).toEqual({
			id: 'userId',
			email: 'user@email.com',
		})

		expect(decodedRefreshToken.user).toEqual({
			id: 'userId',
			email: 'user@email.com',
		})
	})

	it('should not set user fields if not jwtTokenFields is set on create session', async () => {
		mockGetObject.mockResolvedValueOnce({
			id: 'userId',
			email: 'user@email.com',
		})

		const session = new Session()

		const { accessToken, refreshToken } = await session.create(
			'userId',
			context,
		)

		const decodedAccessToken = jwt.decode(accessToken) as JwtPayload
		const decodedRefreshToken = jwt.decode(refreshToken) as JwtPayload

		expect(decodedAccessToken.user).toBeUndefined()

		expect(decodedRefreshToken.user).toBeUndefined()
	})

	it('should not set user fields if not jwtTokenFields is set on refresh session', async () => {
		const session = new Session()

		const { accessToken: oldAccessToken, refreshToken: oldRefreshToken } =
			await session.create('userId', context)

		mockGetObjects.mockResolvedValue([
			{
				id: 'sessionId',
				refreshToken: oldRefreshToken,
				refreshTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
				user: {
					id: 'userId',
					email: 'userEmail',
				},
			},
		])
		mockGetObject.mockResolvedValue({
			id: 'userId',
			email: 'user@email.com',
		})

		const { accessToken, refreshToken } = await session.refresh(
			oldAccessToken,
			oldRefreshToken,
			context,
		)

		if (!accessToken || !refreshToken) fail()

		const decodedAccessToken = jwt.decode(accessToken) as JwtPayload
		const decodedRefreshToken = jwt.decode(refreshToken) as JwtPayload

		expect(decodedAccessToken.user).toBeUndefined()

		expect(decodedRefreshToken.user).toBeUndefined()
	})

	it('should returns null if no user found', async () => {
		mockGetObjects.mockResolvedValue([])

		const session = new Session()

		const { accessToken } = await session.create('userId', context)

		const res = await session.meFromAccessToken(
			{ accessToken, csrfToken: '' },
			context,
		)

		expect(res.user).toBeNull()
		expect(res.sessionId).toBeNull()

		expect(mockGetObjects).toHaveBeenCalledTimes(1)
		expect(mockGetObjects).toHaveBeenCalledWith({
			className: '_Session',
			where: {
				accessToken: { equalTo: accessToken },
				OR: [
					{
						accessTokenExpiresAt: { greaterThanOrEqualTo: expect.any(Date) },
					},
					{
						refreshTokenExpiresAt: { greaterThanOrEqualTo: expect.any(Date) },
					},
				],
			},
			first: 1,
			select: {
				id: true,
				user: true,
				accessTokenExpiresAt: true,
				refreshTokenExpiresAt: true,
				refreshToken: true,
			},
			context: expect.any(Object),
		})
	})

	it('should return the user associated with an access token', async () => {
		mockGetObjects.mockResolvedValue([
			{
				id: 'sessionId',
				refreshToken: 'refreshToken',
				user: {
					id: 'userId',
					email: 'userEmail',
				},
				refreshTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
			},
		])

		const session = new Session()

		const { accessToken } = await session.create('userId', context)

		const { sessionId, user } = await session.meFromAccessToken(
			{ accessToken, csrfToken: '' },
			context,
		)

		expect(mockGetObjects).toHaveBeenCalledTimes(1)
		expect(mockGetObjects).toHaveBeenCalledWith({
			className: '_Session',
			where: {
				accessToken: { equalTo: accessToken },
				OR: [
					{
						accessTokenExpiresAt: { greaterThanOrEqualTo: expect.any(Date) },
					},
					{
						refreshTokenExpiresAt: { greaterThanOrEqualTo: expect.any(Date) },
					},
				],
			},
			first: 1,
			select: {
				id: true,
				user: true,
				accessTokenExpiresAt: true,
				refreshTokenExpiresAt: true,
				refreshToken: true,
			},
			context: expect.any(Object),
		})

		expect(sessionId).toEqual('sessionId')
		expect(user?.id).toEqual('userId')
		expect(user?.email).toEqual('userEmail')
	})

	it('should create a new session', async () => {
		const session = new Session()

		const fifteenMinutes = new Date(Date.now() + 1000 * 60 * 15)
		const thirtyDays = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)

		const { accessToken, refreshToken } = await session.create(
			'userId',
			context,
		)

		expect(accessToken).not.toBeUndefined()
		expect(refreshToken).not.toBeUndefined()

		if (!accessToken || !refreshToken) fail()

		const decodedAccessToken = jwt.decode(accessToken) as JwtPayload
		const decodedRefreshToken = jwt.decode(refreshToken) as JwtPayload

		expect(decodedAccessToken).not.toBeNull()
		expect(decodedAccessToken.userId).toEqual('userId')
		expect(decodedAccessToken.exp).toBeGreaterThanOrEqual(
			fifteenMinutes.getTime(),
		)
		expect(decodedAccessToken.iat).toBeGreaterThanOrEqual(Date.now() - 500) // minus 500ms to avoid flaky

		expect(decodedRefreshToken).not.toBeNull()
		expect(decodedRefreshToken.userId).toEqual('userId')
		expect(decodedRefreshToken.exp).toBeGreaterThanOrEqual(thirtyDays.getTime())
		expect(decodedRefreshToken.iat).toBeGreaterThanOrEqual(Date.now() - 500) // minus 500ms to avoid flaky

		expect(mockCreateObject).toHaveBeenCalledTimes(1)
		expect(mockCreateObject).toHaveBeenCalledWith({
			className: '_Session',
			context: expect.any(Object),
			data: {
				accessToken,
				accessTokenExpiresAt: expect.any(Date),
				refreshToken,
				refreshTokenExpiresAt: expect.any(Date),
				user: 'userId',
			},
			select: { id: true },
		})
	})

	it('should delete a session', async () => {
		const session = new Session()

		await session.delete({
			sessionId: 'sessionId',
			wabe: {
				controllers,
			},
		} as any)

		expect(mockDeleteObject).toHaveBeenCalledTimes(1)
		expect(mockDeleteObject).toHaveBeenCalledWith({
			className: '_Session',
			context: {
				sessionId: 'sessionId',
				wabe: { controllers },
				isRoot: true,
			},
			id: 'sessionId',
			select: {},
		})
	})

	it('should refresh a session', async () => {
		const session = new Session()

		const { accessToken: oldAccessToken, refreshToken: oldRefreshToken } =
			await session.create('userId', context)

		mockGetObjects.mockResolvedValue([
			{
				id: 'sessionId',
				refreshToken: oldRefreshToken,
				refreshTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
				user: {
					id: 'userId',
					email: 'userEmail',
				},
			},
		])

		const { accessToken, refreshToken } = await session.refresh(
			oldAccessToken,
			oldRefreshToken,
			context,
		)

		expect(accessToken).not.toBeUndefined()
		expect(refreshToken).not.toBeUndefined()

		expect(mockGetObjects).toHaveBeenCalledTimes(1)
		expect(mockGetObjects).toHaveBeenCalledWith({
			className: '_Session',
			where: {
				accessToken: { equalTo: oldAccessToken },
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
			context: expect.any(Object),
		})

		expect(mockUpdateObject).toHaveBeenCalledTimes(1)
		expect(mockUpdateObject).toHaveBeenCalledWith({
			className: '_Session',
			context: expect.any(Object),
			id: 'sessionId',
			data: {
				accessToken: expect.any(String),
				accessTokenExpiresAt: expect.any(Date),
				refreshToken: expect.any(String),
				refreshTokenExpiresAt: expect.any(Date),
			},
			select: {},
		})

		const accessTokenExpiresAt = mockUpdateObject.mock.calls[0][0].data
			.accessTokenExpiresAt as Date

		const refreshTokenExpiresAt = mockUpdateObject.mock.calls[0][0].data
			.refreshTokenExpiresAt as Date

		// -1000 to avoid flaky
		expect(accessTokenExpiresAt.getTime()).toBeGreaterThan(
			Date.now() + 1000 * 60 * 15 - 1000,
		)

		// -1000 to avoid flaky
		expect(refreshTokenExpiresAt.getTime()).toBeGreaterThan(
			Date.now() + 1000 * 60 * 60 * 24 * 30 - 1000,
		)
	})

	it('should not refresh session if the access token does not already take 75% of time', () => {
		const session = new Session()

		// 1 hour
		const refreshTokenAgeInMs = 1000 * 60 * 60

		// Expires in 1 hour
		const date1 = new Date(Date.now() + 1000 * 60 * 60)
		// Expires in 20 minutes
		const date2 = new Date(Date.now() + 1000 * 60 * 15)
		// Expired since 20 minutes
		const date3 = new Date(Date.now() - 1000 * 60 * 20)

		expect(session._isRefreshTokenExpired(date1, refreshTokenAgeInMs)).toBe(
			false,
		)
		expect(session._isRefreshTokenExpired(date2, refreshTokenAgeInMs)).toBe(
			true,
		)
		expect(session._isRefreshTokenExpired(date3, refreshTokenAgeInMs)).toBe(
			true,
		)
	})

	it('should return null on refresh session if session not found', async () => {
		mockGetObjects.mockResolvedValue([])

		const session = new Session()

		const { accessToken: oldAccessToken, refreshToken: oldRefreshToken } =
			await session.create('userId', context)

		const { accessToken, refreshToken } = await session.refresh(
			oldAccessToken,
			oldRefreshToken,
			context,
		)

		expect(accessToken).toBeNull()
		expect(refreshToken).toBeNull()

		expect(mockGetObjects).toHaveBeenCalledTimes(1)
		expect(mockGetObjects).toHaveBeenCalledWith({
			className: '_Session',
			where: {
				accessToken: { equalTo: oldAccessToken },
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
			context: expect.any(Object),
		})
	})

	it("should throw an error on refresh session if session's refresh token is expired", async () => {
		mockGetObjects.mockResolvedValue([
			{
				id: 'sessionId',
				refreshToken: 'refreshToken',
				refreshTokenExpiresAt: new Date(Date.now() - 1000),
				user: {
					id: 'userId',
					email: 'userEmail',
				},
			},
		])

		const session = new Session()

		const { refreshToken, accessToken } = await session.create(
			'userId',
			context,
		)

		expect(session.refresh(accessToken, refreshToken, context)).rejects.toThrow(
			'Refresh token expired',
		)
	})

	it("should throw an error on refresh session if session's refresh token is not the same as the one in the database", async () => {
		mockGetObjects.mockResolvedValue([
			{
				id: 'sessionId',
				refreshToken: 'refreshToken',
				refreshTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
				user: {
					id: 'userId',
					email: 'userEmail',
				},
			},
		])

		const session = new Session()

		const { refreshToken, accessToken } = await session.create(
			'userId',
			context,
		)

		expect(session.refresh(accessToken, refreshToken, context)).rejects.toThrow(
			'Invalid refresh token',
		)
	})
})
