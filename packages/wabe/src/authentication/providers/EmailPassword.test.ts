import { describe, expect, it, mock, spyOn, afterEach, afterAll } from 'bun:test'
import * as crypto from '../../utils/crypto'

import { EmailPassword } from './EmailPassword'

describe('Email password', () => {
	const mockGetObjects = mock(() => Promise.resolve([]))
	const mockCount = mock(() => Promise.resolve(0)) as any
	const mockCreateObject = mock(() => Promise.resolve({ id: 'userId' })) as any

	const spyArgonPasswordVerify = spyOn(crypto, 'verifyArgon2')
	const spyBunPasswordHash = spyOn(crypto, 'hashArgon2')

	const controllers = {
		controllers: {
			database: {
				getObjects: mockGetObjects,
				createObject: mockCreateObject,
				count: mockCount,
			},
		},
	} as any

	afterEach(() => {
		mockGetObjects.mockClear()
		mockCount.mockClear()
		mockCreateObject.mockClear()
		spyArgonPasswordVerify.mockClear()
		spyBunPasswordHash.mockClear()
	})

	afterAll(() => {
		spyArgonPasswordVerify.mockRestore()
		spyBunPasswordHash.mockRestore()
	})

	const emailPassword = new EmailPassword()

	it('should signUp with email password', async () => {
		spyBunPasswordHash.mockResolvedValueOnce('$argon2id$hashedPassword')

		const {
			authenticationDataToSave: { email },
		} = await emailPassword.onSignUp({
			context: { wabe: controllers } as any,
			input: { email: 'email@test.fr', password: 'password' },
		})

		expect(email).toBe('email@test.fr')
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

		spyArgonPasswordVerify.mockResolvedValueOnce(true)

		const { user } = await emailPassword.onSignIn({
			context: { wabe: controllers } as any,
			input: { email: 'email@test.fr', password: 'password' },
		})

		expect(user).toEqual({
			id: 'userId',
			authentication: {
				emailPassword: {
					email: 'email@test.fr',
					password: 'hashedPassword',
				},
			},
		})

		expect(spyArgonPasswordVerify).toHaveBeenCalledTimes(1)
		expect(spyArgonPasswordVerify).toHaveBeenCalledWith('password', 'hashedPassword')
	})

	it('should not signIn with email password if password is undefined', () => {
		spyArgonPasswordVerify.mockResolvedValueOnce(false)

		expect(
			emailPassword.onSignIn({
				context: { wabe: controllers } as any,
				// @ts-expect-error
				input: { email: 'email@test.fr' },
			}),
		).rejects.toThrow('Invalid authentication credentials')
	})

	it('should not signIn with email password if there is no user found', () => {
		mockGetObjects.mockResolvedValue([])

		expect(
			emailPassword.onSignIn({
				context: { wabe: controllers } as any,
				input: {
					email: 'invalidEmail@test.fr',
					password: 'password',
				},
			}),
		).rejects.toThrow('Invalid authentication credentials')

		expect(spyArgonPasswordVerify).toHaveBeenCalledTimes(1)
	})

	it('should not signIn with email password if there is email is invalid', () => {
		mockGetObjects.mockResolvedValue([
			{
				authentication: {
					emailPassword: {
						password: 'hashedPassword',
					},
				},
			} as never,
		])

		spyArgonPasswordVerify.mockResolvedValueOnce(true)

		expect(
			emailPassword.onSignIn({
				context: { wabe: controllers } as any,
				input: {
					email: 'invalidEmail@test.fr',
					password: 'password',
				},
			}),
		).rejects.toThrow('Invalid authentication credentials')

		expect(spyArgonPasswordVerify).toHaveBeenCalledTimes(1)
	})

	it('should rate limit signIn attempts in production', async () => {
		mockGetObjects.mockResolvedValue([])

		const context = {
			wabe: {
				...controllers,
				config: {
					isProduction: true,
					authentication: {
						security: {
							signInRateLimit: {
								enabled: true,
								maxAttempts: 2,
								windowMs: 60_000,
								blockDurationMs: 60_000,
							},
						},
					},
				},
			},
		} as any

		const input = {
			email: 'ratelimit-email-password@test.fr',
			password: 'password',
		}

		await expect(emailPassword.onSignIn({ context, input })).rejects.toThrow(
			'Invalid authentication credentials',
		)
		await expect(emailPassword.onSignIn({ context, input })).rejects.toThrow(
			'Invalid authentication credentials',
		)

		const callsBeforeBlockedAttempt = mockGetObjects.mock.calls.length

		await expect(emailPassword.onSignIn({ context, input })).rejects.toThrow(
			'Invalid authentication credentials',
		)

		expect(mockGetObjects.mock.calls.length).toBe(callsBeforeBlockedAttempt)
	})

	it('should rate limit signUp attempts in production', async () => {
		mockCount.mockResolvedValue(1)

		const context = {
			wabe: {
				...controllers,
				config: {
					isProduction: true,
					authentication: {
						security: {
							signUpRateLimit: {
								enabled: true,
								maxAttempts: 2,
								windowMs: 60_000,
								blockDurationMs: 60_000,
							},
						},
					},
				},
			},
		} as any

		const input = {
			email: 'ratelimit-signup-email-password@test.fr',
			password: 'password',
		}

		await expect(emailPassword.onSignUp({ context, input })).rejects.toThrow(
			'Not authorized to create user',
		)
		await expect(emailPassword.onSignUp({ context, input })).rejects.toThrow(
			'Not authorized to create user',
		)

		const callsBeforeBlockedAttempt = mockCount.mock.calls.length

		await expect(emailPassword.onSignUp({ context, input })).rejects.toThrow(
			'Not authorized to create user',
		)

		expect(mockCount.mock.calls.length).toBe(callsBeforeBlockedAttempt)
	})

	it('should not update authentication data if there is no user found', () => {
		mockGetObjects.mockResolvedValue([])

		spyArgonPasswordVerify.mockResolvedValueOnce(true)

		expect(
			emailPassword.onUpdateAuthenticationData?.({
				context: { wabe: controllers } as any,
				input: {
					email: 'email@test.fr',
					password: 'password',
				},
				userId: 'userId',
			}),
		).rejects.toThrow('User not found')
	})

	it('should update authentication data if the userId match with an user', async () => {
		mockGetObjects.mockResolvedValue([
			{
				id: 'id',
			},
		] as any)

		spyBunPasswordHash.mockResolvedValueOnce('$argon2id$hashedPassword')

		const res = await emailPassword.onUpdateAuthenticationData?.({
			context: { wabe: controllers } as any,
			input: {
				email: 'email@test.fr',
				password: 'password',
			},
			userId: 'userId',
		})

		expect(res.authenticationDataToSave.email).toBe('email@test.fr')
	})
})
