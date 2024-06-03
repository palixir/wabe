import {
	describe,
	expect,
	it,
	beforeAll,
	mock,
	spyOn,
	beforeEach,
} from 'bun:test'
import { fail } from 'node:assert'
import jwt, { type JwtPayload } from 'jsonwebtoken'
import { Session } from './Session'
import { WibeApp } from '../server'

describe('Session', () => {
	const mockGetObject = mock(() => Promise.resolve({}) as any)
	const mockGetObjects = mock(() => Promise.resolve([]) as any)
	const mockCreateObject = mock(() =>
		Promise.resolve({ id: 'userId' }),
	) as any
	const mockDeleteObject = mock(() => Promise.resolve()) as any
	const mockUpdateObject = mock(() => Promise.resolve()) as any

	beforeAll(() => {
		WibeApp.databaseController = {
			getObject: mockGetObject,
			getObjects: mockGetObjects,
			createObject: mockCreateObject,
			deleteObject: mockDeleteObject,
			updateObject: mockUpdateObject,
		} as any
	})

	beforeEach(() => {
		mockGetObject.mockClear()
		mockGetObjects.mockClear()
		mockCreateObject.mockClear()
		mockDeleteObject.mockClear()
		mockUpdateObject.mockClear()
	})

	it('should throw an error if the refreshToken is not equal to database refreshToken', async () => {
		mockGetObjects.mockResolvedValue([
			{
				id: 'sessionId',
				refreshToken: 'anotherRefreshToken',
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

		expect(
			session.meFromAccessToken('accessToken', 'refreshToken'),
		).rejects.toThrow('Invalid refresh token')

		expect(mockGetObjects).toHaveBeenCalledTimes(1)
		expect(mockGetObjects).toHaveBeenCalledWith({
			className: '_Session',
			where: {
				accessToken: { equalTo: 'accessToken' },
			},
			limit: 1,
			fields: [
				'id',
				'user.id',
				'user.email',
				'refreshToken',
				'refreshTokenExpiresAt',
			],
		})
	})

	it('should returns null if no user found', async () => {
		mockGetObjects.mockResolvedValue([])

		const session = new Session()

		const res = await session.meFromAccessToken(
			'accessToken',
			'refreshToken',
		)

		expect(res).toBeNull()

		expect(mockGetObjects).toHaveBeenCalledTimes(1)
		expect(mockGetObjects).toHaveBeenCalledWith({
			className: '_Session',
			where: {
				accessToken: { equalTo: 'accessToken' },
			},
			limit: 1,
			fields: [
				'id',
				'user.id',
				'user.email',
				'refreshToken',
				'refreshTokenExpiresAt',
			],
		})
	})

	it('should returns user from access token and refresh the refresh token', async () => {
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

		const mockRefreshWithSessionObject = spyOn(
			Session.prototype,
			'refreshWithSessionObject',
		).mockResolvedValue({} as never)

		const session = new Session()

		const res = await session.meFromAccessToken(
			'accessToken',
			'refreshToken',
		)

		const user = res?.user

		expect(mockGetObjects).toHaveBeenCalledTimes(1)
		expect(mockGetObjects).toHaveBeenCalledWith({
			className: '_Session',
			where: {
				accessToken: { equalTo: 'accessToken' },
			},
			limit: 1,
			fields: [
				'id',
				'user.id',
				'user.email',
				'refreshToken',
				'refreshTokenExpiresAt',
			],
		})

		expect(user?.id).toEqual('userId')
		expect(user?.email).toEqual('userEmail')

		expect(mockRefreshWithSessionObject).toHaveBeenCalledTimes(1)
		expect(mockRefreshWithSessionObject).toHaveBeenCalledWith(
			{
				id: 'sessionId',
				refreshToken: 'refreshToken',
				user: expect.any(Object),
				refreshTokenExpiresAt: expect.any(Date),
			},
			{
				sessionId: 'sessionId',
				user: expect.any(Object),
				isRoot: false,
			},
		)

		mockRefreshWithSessionObject.mockRestore()
	})

	it('should create a new session', async () => {
		const session = new Session()

		const fifteenMinutes = new Date(Date.now() + 1000 * 60 * 15)
		const thirtyDays = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)

		const { accessToken, refreshToken } = await session.create(
			'userId',
			{} as any,
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
		expect(decodedRefreshToken.exp).toBeGreaterThanOrEqual(
			thirtyDays.getTime(),
		)
		expect(decodedRefreshToken.iat).toBeGreaterThanOrEqual(Date.now() - 500) // minus 500ms to avoid flaky

		expect(mockCreateObject).toHaveBeenCalledTimes(1)
		expect(mockCreateObject).toHaveBeenCalledWith({
			className: '_Session',
			context: {},
			data: {
				accessToken,
				accessTokenExpiresAt: expect.any(Date),
				refreshToken,
				refreshTokenExpiresAt: expect.any(Date),
				user: 'userId',
			},
		})
	})

	it('should delete a session', async () => {
		const session = new Session()

		await session.delete({ sessionId: 'sessionId' } as any)

		expect(mockDeleteObject).toHaveBeenCalledTimes(1)
		expect(mockDeleteObject).toHaveBeenCalledWith({
			className: '_Session',
			context: { sessionId: 'sessionId' },
			id: 'sessionId',
		})
	})

	it('should not refresh a session if the refresh token has expired', async () => {
		mockGetObject.mockResolvedValue({
			userId: 'userId',
			refreshTokenExpiresAt: new Date(Date.now() - 1000),
		})

		const session = new Session()

		expect(session.refresh('sessionId', {} as any)).rejects.toThrow(
			'Refresh token has expired',
		)
	})

	it('should rotate the refresh token', async () => {
		const session = new Session()

		const context = {
			sessionId: 'sessionId',
			user: {
				id: 'userId',
			},
			isRoot: false,
		}

		const mockSign = spyOn(jwt, 'sign').mockReturnValue('token' as any)

		await session._rotateRefreshToken(context)

		expect(mockUpdateObject).toHaveBeenCalledTimes(1)
		expect(mockUpdateObject).toHaveBeenCalledWith({
			className: '_Session',
			context,
			id: context.sessionId,
			data: {
				refreshToken: 'token',
				refreshTokenExpiresAt: expect.any(Date),
			},
		})

		mockSign.mockRestore()
	})

	it('should rotate the refresh token after the session was refreshed', async () => {
		mockGetObject.mockResolvedValue({
			userId: 'userId',
		})
		const mockSign = spyOn(jwt, 'sign').mockReturnValue('token' as any)
		const spyRotateRefreshToken = spyOn(
			Session.prototype,
			'_rotateRefreshToken',
		)

		const session = new Session()

		const { sessionId } = await session.create('userId', {
			sessionId: 'sessionId',
			user: { id: 'userId' },
		} as any)

		await session.refresh(sessionId, {
			sessionId: 'sessionId',
			user: { id: 'userId' },
		} as any)

		expect(spyRotateRefreshToken).toHaveBeenCalledTimes(1)

		mockSign.mockRestore()
	})

	it('should refresh a session', async () => {
		mockGetObject.mockResolvedValue({
			userId: 'userId',
		})
		const mockSign = spyOn(jwt, 'sign').mockReturnValue('token' as any)

		const session = new Session()

		const { sessionId } = await session.create('userId', {} as any)

		await session.refresh(sessionId, {
			sessionId: 'sessionId',
			user: { id: 'userId' },
		} as any)

		expect(mockUpdateObject).toHaveBeenCalledTimes(2)
		expect(mockUpdateObject).toHaveBeenNthCalledWith(1, {
			className: '_Session',
			context: {
				sessionId: 'sessionId',
				user: {
					id: 'userId',
				},
			},
			id: sessionId,
			data: {
				accessToken: 'token',
				accessTokenExpiresAt: expect.any(Date),
			},
		})

		mockSign.mockRestore()
	})
})
