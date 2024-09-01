import { describe, expect, it, mock, spyOn, beforeEach } from 'bun:test'
import argon2 from 'argon2'
import { EmailPassword } from './EmailPassword'

describe('Email password', () => {
	const mockGetObjects = mock(() => Promise.resolve([]))
	const mockCreateObject = mock(() =>
		Promise.resolve({ id: 'userId' }),
	) as any

	const spyArgonPasswordVerify = spyOn(argon2, 'verify')

	const controllers = {
		controllers: {
			database: {
				getObjects: mockGetObjects,
				createObject: mockCreateObject,
			},
		},
	} as any

	beforeEach(() => {
		mockGetObjects.mockClear()
		mockCreateObject.mockClear()
		spyArgonPasswordVerify.mockClear()
	})

	const emailPassword = new EmailPassword()

	it('should signUp with email password', async () => {
		const spyBunPasswordHash = spyOn(argon2, 'hash').mockResolvedValue(
			'$argon2id$hashedPassword',
		)

		const {
			authenticationDataToSave: { email, password },
		} = await emailPassword.onSignUp({
			context: { wabe: controllers } as any,
			input: { email: 'email@test.fr', password: 'password' },
		})

		expect(email).toBe('email@test.fr')
		expect(password).toBe('$argon2id$hashedPassword')

		expect(spyBunPasswordHash).toHaveBeenCalledTimes(1)
		expect(spyBunPasswordHash).toHaveBeenCalledWith('password')

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

		spyArgonPasswordVerify.mockResolvedValue(true)

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
		expect(spyArgonPasswordVerify).toHaveBeenCalledWith(
			'hashedPassword',
			'password',
		)
	})

	it('should not signIn with email password if password is undefined', async () => {
		spyArgonPasswordVerify.mockResolvedValue(false)

		expect(
			emailPassword.onSignIn({
				context: { wabe: controllers } as any,
				// @ts-expect-error
				input: { email: 'email@test.fr' },
			}),
		).rejects.toThrow('Invalid authentication credentials')
	})

	it('should not signIn with email password if there is no user found', async () => {
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

		expect(spyArgonPasswordVerify).toHaveBeenCalledTimes(0)
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

		spyArgonPasswordVerify.mockResolvedValue(true)

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
})
