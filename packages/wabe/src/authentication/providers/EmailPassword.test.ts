import { describe, expect, it, mock, spyOn, beforeEach } from 'bun:test'
import { EmailPassword } from './EmailPassword'

describe('Email password', () => {
	const mockGetObjects = mock(() => Promise.resolve([]))
	const mockCreateObject = mock(() =>
		Promise.resolve({ id: 'userId' }),
	) as any

	const spyBunPasswordVerify = spyOn(Bun.password, 'verify')

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
		spyBunPasswordVerify.mockClear()
	})

	const emailPassword = new EmailPassword()

	it('should signUp with email password', async () => {
		const spyBunPasswordHash = spyOn(
			Bun.password,
			'hash',
		).mockResolvedValue('$argon2id$hashedPassword')

		const {
			authenticationDataToSave: { email, password },
		} = await emailPassword.onSignUp({
			context: { wabeApp: controllers } as any,
			input: { email: 'email@test.fr', password: 'password' },
		})

		expect(email).toBe('email@test.fr')
		expect(password).toBe('$argon2id$hashedPassword')

		expect(spyBunPasswordHash).toHaveBeenCalledTimes(1)
		expect(spyBunPasswordHash).toHaveBeenCalledWith('password', 'argon2id')

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

		spyBunPasswordVerify.mockResolvedValue(true)

		const { user } = await emailPassword.onSignIn({
			context: { wabeApp: controllers } as any,
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

		expect(spyBunPasswordVerify).toHaveBeenCalledTimes(1)
		expect(spyBunPasswordVerify).toHaveBeenCalledWith(
			'password',
			'hashedPassword',
			'argon2id',
		)
	})

	it('should not signIn with email password if password is undefined', async () => {
		spyBunPasswordVerify.mockResolvedValue(false)

		expect(
			emailPassword.onSignIn({
				context: { wabeApp: controllers } as any,
				// @ts-expect-error
				input: { email: 'email@test.fr' },
			}),
		).rejects.toThrow('Invalid authentication credentials')
	})

	it('should not signIn with email password if there is no user found', async () => {
		mockGetObjects.mockResolvedValue([])

		expect(
			emailPassword.onSignIn({
				context: { wabeApp: controllers } as any,
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
				context: { wabeApp: controllers } as any,
				input: {
					email: 'invalidEmail@test.fr',
					password: 'password',
				},
			}),
		).rejects.toThrow('Invalid authentication credentials')

		expect(spyBunPasswordVerify).toHaveBeenCalledTimes(1)
	})
})
