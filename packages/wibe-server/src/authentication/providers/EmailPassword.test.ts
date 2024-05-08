import {
	describe,
	expect,
	it,
	mock,
	spyOn,
	beforeAll,
	beforeEach,
} from 'bun:test'
import jwt from 'jsonwebtoken'
import { EmailPassword } from './EmailPassword'
import { WibeApp } from '../../server'

describe('Email password', () => {
	const mockGetObjects = mock(() => Promise.resolve([]))
	const mockCreateObject = mock(() =>
		Promise.resolve({ id: 'userId' }),
	) as any

	const spyBunPasswordVerify = spyOn(Bun.password, 'verify')
	const mockSign = spyOn(jwt, 'sign')

	beforeAll(() => {
		WibeApp.databaseController = {
			getObjects: mockGetObjects,
			createObject: mockCreateObject,
		} as any
	})

	beforeEach(() => {
		mockGetObjects.mockClear()
		mockCreateObject.mockClear()
		spyBunPasswordVerify.mockClear()
		mockSign.mockClear()
	})

	const emailPassword = new EmailPassword()

	it('should signUp with email password', async () => {
		mockSign.mockReturnValue('token' as any)
		const spyBunPasswordHash = spyOn(
			Bun.password,
			'hash',
		).mockResolvedValue('$argon2id$hashedPassword')

		const res = await emailPassword.onSignUp({
			context: {} as any,
			input: { email: 'email@test.fr', password: 'password' },
		})

		expect(res.dataToStore).toEqual({
			accessToken: 'token',
			refreshToken: 'token',
			password: expect.any(String),
			email: 'email@test.fr',
			expireAt: expect.any(Date),
		})

		expect(spyBunPasswordHash).toHaveBeenCalledTimes(1)
		expect(spyBunPasswordHash).toHaveBeenCalledWith('password', 'argon2id')
		expect(res.dataToStore.password).toContain('$argon2id$')

		expect(mockSign).toHaveBeenCalledTimes(2)
		expect(mockSign).toHaveBeenNthCalledWith(
			1,
			{
				userId: 'userId',
				iat: expect.any(Number),
				exp: expect.any(Number),
			},
			'dev',
		)
		expect(mockSign).toHaveBeenNthCalledWith(
			2,
			{
				userId: 'userId',
				iat: expect.any(Number),
				exp: expect.any(Number),
			},
			'dev',
		)

		spyBunPasswordHash.mockRestore()
	})

	it('should signIn with email password', async () => {
		mockGetObjects.mockResolvedValue([
			{
				id: 'userId',
				authentication: {
					emailPassword: {
						email: 'email@test.fr',
						password: 'hashedPassword',
					},
				},
			} as never,
		])

		mockSign.mockReturnValue('token' as any)
		spyBunPasswordVerify.mockResolvedValue(true)

		const res = await emailPassword.onSignIn({
			context: {} as any,
			input: { email: 'email@test.fr', password: 'password' },
		})

		expect(res.dataToStore).toEqual({
			accessToken: 'token',
			refreshToken: 'token',
			password: 'hashedPassword',
			email: 'email@test.fr',
			expireAt: expect.any(Date),
		})

		expect(spyBunPasswordVerify).toHaveBeenCalledTimes(1)
		expect(spyBunPasswordVerify).toHaveBeenCalledWith(
			'password',
			'hashedPassword',
			'argon2id',
		)

		expect(mockSign).toHaveBeenCalledTimes(2)
		expect(mockSign).toHaveBeenNthCalledWith(
			1,
			{
				userId: 'userId',
				iat: expect.any(Number),
				exp: expect.any(Number),
			},
			'dev',
		)
		expect(mockSign).toHaveBeenNthCalledWith(
			2,
			{
				userId: 'userId',
				iat: expect.any(Number),
				exp: expect.any(Number),
			},
			'dev',
		)
	})

	it('should not signIn with email password if password is undefined', async () => {
		spyBunPasswordVerify.mockResolvedValue(false)

		expect(
			emailPassword.onSignIn({
				context: {} as any,
				input: { email: 'email@test.fr' },
			}),
		).rejects.toThrow('Invalid authentication credentials')
	})

	it('should not signIn with email password if there is no user found', async () => {
		mockGetObjects.mockResolvedValue([])

		expect(
			emailPassword.onSignIn({
				context: {} as any,
				input: {
					email: 'invalidEmail@test.fr',
					password: 'password',
				},
			}),
		).rejects.toThrow('Invalid authentication credentials')

		expect(spyBunPasswordVerify).toHaveBeenCalledTimes(0)
	})

	it('should not signIn with email password if there is email is invalid', async () => {
		mockGetObjects.mockResolvedValue([
			{
				authentication: {
					emailPassword: {
						password: 'hashedPassword',
					},
				},
			} as never,
		])

		spyBunPasswordVerify.mockResolvedValue(true)

		expect(
			emailPassword.onSignIn({
				context: {} as any,
				input: {
					email: 'invalidEmail@test.fr',
					password: 'password',
				},
			}),
		).rejects.toThrow('Invalid authentication credentials')

		expect(spyBunPasswordVerify).toHaveBeenCalledTimes(1)
	})
})
