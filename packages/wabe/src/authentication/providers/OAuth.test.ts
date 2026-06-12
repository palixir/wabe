import { afterEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { GitHub } from './GitHub'
import { Google } from './Google'
import * as OAuth from './OAuth'
import { AuthenticationProvider } from '../interface'

// Use GitHub test as use case
describe('OAuth', () => {
	const mockGetObjects = mock(() => Promise.resolve([]))
	const mockCount = mock(() => Promise.resolve(0)) as any
	const mockCreateObject = mock(() => Promise.resolve({ id: 'userId' })) as any

	const mockGetUserInfo = mock().mockResolvedValue({
		providerUserId: 'github-user-id',
		email: 'email@test.fr',
		avatarUrl: 'avatarUrl',
		username: 'username',
		verifiedEmail: true,
	})

	const mockValidateAuthorizationCode = mock().mockResolvedValue({
		accessToken: 'accessToken',
		refreshToken: 'refreshToken',
		accessTokenExpiresAt: new Date(0),
	})

	spyOn(OAuth, 'getProvider').mockReturnValue({
		validateAuthorizationCode: mockValidateAuthorizationCode,
		getUserInfo: mockGetUserInfo,
	} as never)

	const context = {
		wabe: {
			controllers: {
				database: {
					getObjects: mockGetObjects,
					createObject: mockCreateObject,
					count: mockCount,
				},
			},
			config: {
				authentication: {
					providers: {
						github: {
							clientId: 'clientId',
							clientSecret: 'clientSecret',
						},
					},
				},
			},
		},
	} as any

	afterEach(() => {
		mockGetObjects.mockClear()
		mockCreateObject.mockClear()
		mockCount.mockClear()
		mockValidateAuthorizationCode.mockClear()
		mockGetUserInfo.mockClear()
	})

	it('should sign up with GitHub Provider if there is no user found', async () => {
		mockGetUserInfo.mockResolvedValueOnce({
			providerUserId: 'github-user-id',
			email: 'email@test.fr',
			avatarUrl: 'avatarUrl',
			username: 'username',
			verifiedEmail: true,
		})

		const github = new GitHub()

		await github.onSignIn({
			context,
			input: {
				authorizationCode: 'authorizationCode',
				codeVerifier: 'codeVerifier',
			},
		})

		expect(mockValidateAuthorizationCode).toHaveBeenCalledTimes(1)
		expect(mockGetUserInfo).toHaveBeenCalledTimes(1)

		expect(mockGetObjects).toHaveBeenCalledTimes(2)
		expect(mockGetObjects).toHaveBeenNthCalledWith(1, {
			className: 'User',
			where: {
				authentication: {
					github: {
						providerUserId: { equalTo: 'github-user-id' },
					},
				},
			},
			first: 1,
			context: expect.any(Object),
			select: {
				authentication: true,
				role: true,
				secondFA: true,
				email: true,
				id: true,
				provider: true,
				isOauth: true,
				createdAt: true,
				updatedAt: true,
			},
		})
		expect(mockGetObjects).toHaveBeenNthCalledWith(2, {
			className: 'User',
			where: {
				authentication: {
					github: {
						email: { equalTo: 'email@test.fr' },
					},
				},
			},
			first: 1,
			context: expect.any(Object),
			select: {
				authentication: true,
				role: true,
				secondFA: true,
				email: true,
				id: true,
				provider: true,
				isOauth: true,
				createdAt: true,
				updatedAt: true,
			},
		})

		expect(mockCreateObject).toHaveBeenCalledTimes(1)
		expect(mockCreateObject).toHaveBeenCalledWith({
			className: 'User',
			data: {
				provider: AuthenticationProvider.GitHub,
				isOauth: true,
				authentication: {
					github: {
						providerUserId: 'github-user-id',
						email: 'email@test.fr',
						username: 'username',
						avatarUrl: 'avatarUrl',
						verifiedEmail: true,
					},
				},
			},
			context: expect.any(Object),
			select: {
				authentication: true,
				role: true,
				secondFA: true,
				email: true,
				id: true,
				provider: true,
				isOauth: true,
				createdAt: true,
				updatedAt: true,
			},
		})
	})

	it('should sign in with GitHub Provider if there is no user found', async () => {
		mockGetUserInfo.mockResolvedValueOnce({
			providerUserId: 'github-user-id',
			email: 'email@test.fr',
			avatarUrl: 'avatarUrl',
			username: 'username',
			verifiedEmail: true,
		})

		mockGetObjects.mockResolvedValue([
			{
				id: 'userId',
				authentication: {
					github: {
						providerUserId: 'github-user-id',
						email: 'email@test.fr',
					},
				},
				provider: AuthenticationProvider.Google,
				isOauth: true,
			} as any,
		] as never)

		const github = new GitHub()

		await github.onSignIn({
			context,
			input: {
				authorizationCode: 'authorizationCode',
				codeVerifier: 'codeVerifier',
			},
		})

		expect(mockValidateAuthorizationCode).toHaveBeenCalledTimes(1)
		expect(mockGetUserInfo).toHaveBeenCalledTimes(1)

		expect(mockGetObjects).toHaveBeenCalledTimes(1)
		expect(mockGetObjects).toHaveBeenCalledWith({
			className: 'User',
			where: {
				authentication: {
					github: {
						providerUserId: { equalTo: 'github-user-id' },
					},
				},
			},
			first: 1,
			context: expect.any(Object),
			select: {
				authentication: true,
				role: true,
				secondFA: true,
				email: true,
				id: true,
				provider: true,
				isOauth: true,
				createdAt: true,
				updatedAt: true,
			},
		})

		expect(mockCreateObject).toHaveBeenCalledTimes(0)
	})

	it('should reject oauth sign in when provider user id is missing', async () => {
		mockGetUserInfo.mockResolvedValueOnce({
			email: 'email@test.fr',
			avatarUrl: 'avatarUrl',
			username: 'username',
		})

		const github = new GitHub()

		await expect(
			github.onSignIn({
				context,
				input: {
					authorizationCode: 'authorizationCode',
					codeVerifier: 'codeVerifier',
				},
			}),
		).rejects.toThrow('Invalid authentication credentials')
	})

	it('should reject oauth sign in when same email has a different provider user id', async () => {
		mockGetUserInfo.mockResolvedValueOnce({
			providerUserId: 'new-github-user-id',
			email: 'email@test.fr',
			avatarUrl: 'avatarUrl',
			username: 'username',
			verifiedEmail: true,
		})
		mockGetObjects.mockResolvedValueOnce([]).mockResolvedValueOnce([
			{
				id: 'existingUser',
				authentication: {
					github: {
						email: 'email@test.fr',
						providerUserId: 'old-github-user-id',
					},
				},
			},
		] as never)

		const github = new GitHub()

		await expect(
			github.onSignIn({
				context,
				input: {
					authorizationCode: 'authorizationCode',
					codeVerifier: 'codeVerifier',
				},
			}),
		).rejects.toThrow('Invalid authentication credentials')
	})

	it('should reject github oauth sign in when email is not verified', async () => {
		mockGetUserInfo.mockResolvedValueOnce({
			providerUserId: 'github-user-id',
			email: 'email@test.fr',
			avatarUrl: 'avatarUrl',
			username: 'username',
			verifiedEmail: false,
		})

		const github = new GitHub()

		await expect(
			github.onSignIn({
				context,
				input: {
					authorizationCode: 'authorizationCode',
					codeVerifier: 'codeVerifier',
				},
			}),
		).rejects.toThrow('Invalid authentication credentials')

		expect(mockCreateObject).toHaveBeenCalledTimes(0)
	})

	it('should reject oauth sign up when disableSignUp is true', async () => {
		mockGetUserInfo.mockResolvedValueOnce({
			providerUserId: 'github-user-id',
			email: 'email@test.fr',
			avatarUrl: 'avatarUrl',
			username: 'username',
			verifiedEmail: true,
		})

		// No existing user → this is a sign-up attempt.
		mockGetObjects.mockResolvedValue([] as never)

		const github = new GitHub()

		await expect(
			github.onSignIn({
				context: {
					...context,
					wabe: {
						...context.wabe,
						config: {
							...context.wabe.config,
							authentication: {
								...context.wabe.config.authentication,
								disableSignUp: true,
							},
						},
					},
				},
				input: {
					authorizationCode: 'authorizationCode',
					codeVerifier: 'codeVerifier',
				},
			}),
		).rejects.toThrow('Sign up is disabled')

		expect(mockCreateObject).toHaveBeenCalledTimes(0)
	})

	it('should reject google oauth sign in when email is not verified', async () => {
		mockGetUserInfo.mockResolvedValueOnce({
			providerUserId: 'google-user-id',
			email: 'email@test.fr',
			verifiedEmail: false,
		})

		const google = new Google()

		await expect(
			google.onSignIn({
				context: {
					...context,
					wabe: {
						...context.wabe,
						config: {
							...context.wabe.config,
							authentication: {
								...context.wabe.config.authentication,
								providers: {
									google: {
										clientId: 'clientId',
										clientSecret: 'clientSecret',
									},
								},
							},
						},
					},
				},
				input: {
					authorizationCode: 'authorizationCode',
					codeVerifier: 'codeVerifier',
				},
			}),
		).rejects.toThrow('Invalid authentication credentials')
	})
})
