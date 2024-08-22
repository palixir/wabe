import { describe, expect, it, mock, beforeEach } from 'bun:test'
import { fail } from 'node:assert'
import jwt, { type JwtPayload } from 'jsonwebtoken'
import { Session } from './Session'

describe('_Session', () => {
	const mockGetObject = mock(() => Promise.resolve({}) as any)
	const mockGetObjects = mock(() => Promise.resolve([]) as any)
	const mockCreateObject = mock(() =>
		Promise.resolve({ id: 'userId' }),
	) as any
	const mockDeleteObject = mock(() => Promise.resolve()) as any
	const mockUpdateObject = mock(() => Promise.resolve()) as any

	const databaseController = {
		getObject: mockGetObject,
		getObjects: mockGetObjects,
		createObject: mockCreateObject,
		deleteObject: mockDeleteObject,
		updateObject: mockUpdateObject,
	}

	beforeEach(() => {
		mockGetObject.mockClear()
		mockGetObjects.mockClear()
		mockCreateObject.mockClear()
		mockDeleteObject.mockClear()
		mockUpdateObject.mockClear()
	})

	it('should returns null if no user found', async () => {
		mockGetObjects.mockResolvedValue([])

		const session = new Session()

		const res = await session.meFromAccessToken('accessToken', {
			isRoot: true,
			wibeApp: { databaseController },
		} as any)

		expect(res.user).toBeNull()
		expect(res.sessionId).toBeNull()

		expect(mockGetObjects).toHaveBeenCalledTimes(1)
		expect(mockGetObjects).toHaveBeenCalledWith({
			className: '_Session',
			where: {
				accessToken: { equalTo: 'accessToken' },
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
			context: { isRoot: true, wibeApp: { databaseController } },
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
				refreshTokenExpiresAt: new Date(
					Date.now() + 1000 * 60 * 60 * 24 * 30,
				),
			},
		])

		const session = new Session()

		const { sessionId, user } = await session.meFromAccessToken(
			'accessToken',
			{ isRoot: true, wibeApp: { databaseController } } as any,
		)

		expect(mockGetObjects).toHaveBeenCalledTimes(1)
		expect(mockGetObjects).toHaveBeenCalledWith({
			className: '_Session',
			where: {
				accessToken: { equalTo: 'accessToken' },
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

		const { accessToken, refreshToken } = await session.create('userId', {
			wibeApp: { databaseController },
		} as any)

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
		expect(decodedRefreshToken.exp).toBeGreaterThanOrEqual(
			thirtyDays.getTime(),
		)
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
			fields: ['id'],
		})
	})

	it('should delete a session', async () => {
		const session = new Session()

		await session.delete({
			sessionId: 'sessionId',
			wibeApp: {
				databaseController,
			},
		} as any)

		expect(mockDeleteObject).toHaveBeenCalledTimes(1)
		expect(mockDeleteObject).toHaveBeenCalledWith({
			className: '_Session',
			context: {
				sessionId: 'sessionId',
				wibeApp: { databaseController },
			},
			id: 'sessionId',
			fields: [],
		})
	})

	it('should refresh a session', async () => {
		mockGetObjects.mockResolvedValue([
			{
				id: 'sessionId',
				refreshToken: 'refreshToken',
				refreshTokenExpiresAt: new Date(
					Date.now() + 1000 * 60 * 60 * 24 * 30,
				),
				user: {
					id: 'userId',
					email: 'userEmail',
				},
			},
		])

		const session = new Session()

		const { accessToken, refreshToken } = await session.refresh(
			'accessToken',
			'refreshToken',
			{ wibeApp: { databaseController } } as any,
		)

		expect(accessToken).not.toBeUndefined()
		expect(refreshToken).not.toBeUndefined()

		expect(mockGetObjects).toHaveBeenCalledTimes(1)
		expect(mockGetObjects).toHaveBeenCalledWith({
			className: '_Session',
			where: {
				accessToken: { equalTo: 'accessToken' },
			},
			fields: ['id', 'user', 'refreshToken', 'refreshTokenExpiresAt'],
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
			fields: [],
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

	it('should not refresh session if the access token does not already take 75% of time', async () => {
		mockGetObjects.mockResolvedValue([
			{
				id: 'sessionId',
				refreshToken: 'refreshToken',
				refreshTokenExpiresAt: new Date(
					Date.now() + 1000 * 60 * 60 * 24 * 1,
				),
				user: {
					id: 'userId',
					email: 'userEmail',
				},
			},
		])

		const session = new Session()

		const { accessToken, refreshToken } = await session.refresh(
			'accessToken',
			'refreshToken',
			{ wibeApp: { databaseController } } as any,
		)

		expect(accessToken).toBe('accessToken')
		expect(refreshToken).toBe('refreshToken')

		expect(mockGetObjects).toHaveBeenCalledTimes(1)
		expect(mockGetObjects).toHaveBeenCalledWith({
			className: '_Session',
			where: {
				accessToken: { equalTo: 'accessToken' },
			},
			fields: ['id', 'user', 'refreshToken', 'refreshTokenExpiresAt'],
			context: expect.any(Object),
		})

		expect(mockUpdateObject).toHaveBeenCalledTimes(0)
	})

	it('should throw an error on refresh session if session not found', async () => {
		mockGetObjects.mockResolvedValue([])

		const session = new Session()

		expect(
			session.refresh('accessToken', 'refreshToken', {
				wibeApp: { databaseController },
			} as any),
		).rejects.toThrow('Session not found')

		expect(mockGetObjects).toHaveBeenCalledTimes(1)
		expect(mockGetObjects).toHaveBeenCalledWith({
			className: '_Session',
			where: {
				accessToken: { equalTo: 'accessToken' },
			},
			fields: ['id', 'user', 'refreshToken', 'refreshTokenExpiresAt'],
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

		expect(
			session.refresh('accessToken', 'refreshToken', {
				wibeApp: { databaseController },
			} as any),
		).rejects.toThrow('Refresh token expired')
	})

	it("should throw an error on refresh session if session's refresh token is not the same as the one in the database", async () => {
		mockGetObjects.mockResolvedValue([
			{
				id: 'sessionId',
				refreshToken: 'refreshToken',
				refreshTokenExpiresAt: new Date(
					Date.now() + 1000 * 60 * 60 * 24 * 30,
				),
				user: {
					id: 'userId',
					email: 'userEmail',
				},
			},
		])

		const session = new Session()

		expect(
			session.refresh('accessToken', 'wrongRefreshToken', {
				wibeApp: { databaseController },
			} as any),
		).rejects.toThrow('Invalid refresh token')
	})
})
