import { describe, expect, it, mock, spyOn, afterEach, afterAll } from 'bun:test'
import * as crypto from '../../utils/crypto'

import { PhonePassword } from './PhonePassword'

describe('Phone password', () => {
	const mockGetObject = mock(() => Promise.resolve(null)) as any
	const mockGetObjects = mock(() => Promise.resolve([]))
	const mockCount = mock(() => Promise.resolve(0)) as any
	const mockCreateObject = mock(() => Promise.resolve({ id: 'userId' })) as any

	const spyArgonPasswordVerify = spyOn(crypto, 'verifyArgon2')
	const spyBunPasswordHash = spyOn(crypto, 'hashArgon2')

	const controllers = {
		controllers: {
			database: {
				getObject: mockGetObject,
				getObjects: mockGetObjects,
				createObject: mockCreateObject,
				count: mockCount,
			},
		},
	} as any

	afterEach(() => {
		mockGetObject.mockClear()
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

	const phonePassword = new PhonePassword()

	it('should signUp with phone password', async () => {
		spyBunPasswordHash.mockResolvedValueOnce('$argon2id$hashedPassword')

		const {
			authenticationDataToSave: { phone },
		} = await phonePassword.onSignUp({
			context: { wabe: controllers } as any,
			input: { phone: 'phone@test.fr', password: 'password' },
		})

		expect(phone).toBe('phone@test.fr')
	})

	it('should signIn with phone password', async () => {
		mockGetObjects.mockResolvedValue([
			{
				id: 'userId',
				authentication: {
					phonePassword: {
						phone: 'phone@test.fr',
						password: 'hashedPassword',
					},
				},
			} as never,
		])

		spyArgonPasswordVerify.mockResolvedValueOnce(true)

		const { user } = await phonePassword.onSignIn({
			context: { wabe: controllers } as any,
			input: { phone: 'phone@test.fr', password: 'password' },
		})

		expect(user).toEqual({
			id: 'userId',
			authentication: {
				phonePassword: {
					phone: 'phone@test.fr',
					password: 'hashedPassword',
				},
			},
		})

		expect(spyArgonPasswordVerify).toHaveBeenCalledTimes(1)
		expect(spyArgonPasswordVerify).toHaveBeenCalledWith('password', 'hashedPassword')
	})

	it('should not signIn with phone password if password is undefined', () => {
		spyArgonPasswordVerify.mockResolvedValueOnce(false)

		expect(
			phonePassword.onSignIn({
				context: { wabe: controllers } as any,
				// @ts-expect-error
				input: { phone: 'phone@test.fr' },
			}),
		).rejects.toThrow('Invalid authentication credentials')
	})

	it('should not signIn with phone password if there is no user found', () => {
		mockGetObjects.mockResolvedValue([])

		expect(
			phonePassword.onSignIn({
				context: { wabe: controllers } as any,
				input: {
					phone: 'invalidEmail@test.fr',
					password: 'password',
				},
			}),
		).rejects.toThrow('Invalid authentication credentials')

		expect(spyArgonPasswordVerify).toHaveBeenCalledTimes(1)
	})

	it('should not signIn with phone password if there is phone is invalid', () => {
		mockGetObjects.mockResolvedValue([
			{
				authentication: {
					phonePassword: {
						password: 'hashedPassword',
					},
				},
			} as never,
		])

		spyArgonPasswordVerify.mockResolvedValueOnce(true)

		expect(
			phonePassword.onSignIn({
				context: { wabe: controllers } as any,
				input: {
					phone: 'invalidEmail@test.fr',
					password: 'password',
				},
			}),
		).rejects.toThrow('Invalid authentication credentials')

		expect(spyArgonPasswordVerify).toHaveBeenCalledTimes(1)
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
			phone: 'ratelimit-signup-phone-password',
			password: 'password',
		}

		await expect(phonePassword.onSignUp({ context, input })).rejects.toThrow(
			'Not authorized to create user',
		)
		await expect(phonePassword.onSignUp({ context, input })).rejects.toThrow(
			'Not authorized to create user',
		)

		const callsBeforeBlockedAttempt = mockCount.mock.calls.length

		await expect(phonePassword.onSignUp({ context, input })).rejects.toThrow(
			'Not authorized to create user',
		)

		expect(mockCount.mock.calls.length).toBe(callsBeforeBlockedAttempt)
	})

	it('should not update authentication data if there is no user found', () => {
		mockGetObjects.mockResolvedValue([])

		spyArgonPasswordVerify.mockResolvedValueOnce(true)

		expect(
			phonePassword.onUpdateAuthenticationData?.({
				context: { wabe: controllers } as any,
				input: {
					phone: 'phone@test.fr',
					password: 'password',
				},
				userId: 'userId',
			}),
		).rejects.toThrow('User not found')
	})

	it('should update authentication data if the userId match with an user', async () => {
		mockGetObject.mockResolvedValue({
			id: 'id',
		})

		spyBunPasswordHash.mockResolvedValueOnce('$argon2id$hashedPassword')

		const res = await phonePassword.onUpdateAuthenticationData?.({
			context: { wabe: controllers } as any,
			input: {
				phone: 'phone@test.fr',
				password: 'password',
			},
			userId: 'userId',
		})

		expect(res.authenticationDataToSave.phone).toBe('phone@test.fr')
	})
})
