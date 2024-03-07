import { describe, expect, it, mock, spyOn, beforeAll } from 'bun:test'
import { EmailPassword } from './EmailPassword'
import { WibeApp } from '../../server'

describe('Email password', () => {
	const mockGetObjects = mock(() => Promise.resolve([]))
	const mockCreateObject = mock(() =>
		Promise.resolve({ id: 'userId' }),
	) as any

	beforeAll(() => {
		WibeApp.databaseController = {
			getObjects: mockGetObjects,
			createObject: mockCreateObject,
		} as any
	})

	const emailPassword = new EmailPassword()

	it('should signUp with email password', async () => {
		const mockSign = mock(() => Promise.resolve('token'))
		const spyBunPasswordHash = spyOn(
			Bun.password,
			'hash',
		).mockResolvedValue('$argon2id$hashedPassword')

		const res = await emailPassword.onSignUp({
			context: {
				cookie: {},
				jwt: { sign: mockSign },
			} as any,
			input: { email: 'email@test.fr', password: 'password' },
		})

		expect(res.dataToStore).toEqual({
			accessToken: 'token',
			refreshToken: 'token',
			password: expect.any(String),
			email: 'email@test.fr',
		})

		expect(spyBunPasswordHash).toHaveBeenCalledTimes(1)
		expect(spyBunPasswordHash).toHaveBeenCalledWith('password', 'argon2id')
		expect(res.dataToStore.password).toContain('$argon2id$')

		expect(mockSign).toHaveBeenCalledTimes(2)
		expect(mockSign).toHaveBeenNthCalledWith(1, {
			userId: 'userId',
			iat: expect.any(Number),
			exp: expect.any(Number),
		})
		expect(mockSign).toHaveBeenNthCalledWith(2, {
			userId: 'userId',
			iat: expect.any(Number),
			exp: expect.any(Number),
		})

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

		const mockSetCookie = mock(() => {})
		const mockSign = mock(() => Promise.resolve('token'))
		const spyBunPasswordVerify = spyOn(
			Bun.password,
			'verify',
		).mockResolvedValue(true)

		const res = await emailPassword.onSignIn({
			context: {
				cookie: {
					access_token: { set: mockSetCookie },
					refresh_token: { set: mockSetCookie },
				},
				jwt: { sign: mockSign },
			} as any,
			input: { email: 'email@test.fr', password: 'password' },
		})

		expect(res.dataToStore).toEqual({
			accessToken: 'token',
			refreshToken: 'token',
			password: 'hashedPassword',
			email: 'email@test.fr',
		})

		expect(spyBunPasswordVerify).toHaveBeenCalledTimes(1)
		expect(spyBunPasswordVerify).toHaveBeenCalledWith(
			'password',
			'hashedPassword',
			'argon2id',
		)

		expect(mockSetCookie).toHaveBeenCalledTimes(2)
		expect(mockSetCookie).toHaveBeenNthCalledWith(1, {
			value: 'token',
			httpOnly: true,
			path: '/',
			// Don't put the exact date to avoid flaky tests
			expires: expect.any(Date),
			sameSite: 'strict',
			secure: false,
		})
		expect(mockSetCookie).toHaveBeenNthCalledWith(2, {
			value: 'token',
			httpOnly: true,
			path: '/',
			// Don't put the exact date to avoid flaky tests
			expires: expect.any(Date),
			sameSite: 'strict',
			secure: false,
		})

		expect(mockSign).toHaveBeenCalledTimes(2)
		expect(mockSign).toHaveBeenNthCalledWith(1, {
			userId: 'userId',
			iat: expect.any(Number),
			exp: expect.any(Number),
		})
		expect(mockSign).toHaveBeenNthCalledWith(2, {
			userId: 'userId',
			iat: expect.any(Number),
			exp: expect.any(Number),
		})

		spyBunPasswordVerify.mockRestore()
	})

	it('should not signIn with email password if password is undefined', async () => {
		const mockSetCookie = mock(() => {})
		const mockSign = mock(() => Promise.resolve('token'))
		const spyBunPasswordVerify = spyOn(
			Bun.password,
			'verify',
		).mockResolvedValue(false)

		expect(
			emailPassword.onSignIn({
				context: {
					cookie: {
						access_token: { set: mockSetCookie },
						refresh_token: { set: mockSetCookie },
					},
					jwt: { sign: mockSign },
				} as any,
				input: { email: 'email@test.fr' },
			}),
		).rejects.toThrow('Invalid authentication credentials')

		spyBunPasswordVerify.mockRestore()
	})

	it('should not signIn with email password if identifier are different', async () => {
		const mockSetCookie = mock(() => {})
		const mockSign = mock(() => Promise.resolve('token'))
		const spyBunPasswordVerify = spyOn(
			Bun.password,
			'verify',
		).mockResolvedValue(true)

		expect(
			emailPassword.onSignIn({
				context: {
					cookie: {
						access_token: { set: mockSetCookie },
						refresh_token: { set: mockSetCookie },
					},
					jwt: { sign: mockSign },
				} as any,
				input: {
					email: 'invalidEmail@test.fr',
					password: 'password',
				},
			}),
		).rejects.toThrow('Invalid authentication credentials')

		expect(spyBunPasswordVerify).toHaveBeenCalledTimes(1)
		spyBunPasswordVerify.mockRestore()
	})
})
