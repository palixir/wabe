import { describe, expect, it, mock, spyOn, afterEach } from 'bun:test'
import { signInWithResolver } from './signInWithResolver'
import { Session } from '../Session'
import { SecondaryFactor } from '../interface'

describe('SignInWith', () => {
	const mockOnLogin = mock(() =>
		Promise.resolve({
			user: {
				id: 'id',
			},
		}),
	)
	const mockOnSignUp = mock(() =>
		Promise.resolve({
			authenticationDataToSave: {
				id: 'id',
			},
		}),
	)

	const mockCreateObject = mock(() => Promise.resolve({}))
	const mockGetObject = mock(() => Promise.resolve({ pendingChallenges: [] }))
	const mockUpdateObject = mock(() => Promise.resolve({}))

	const mockOnSendChallenge = mock(() => Promise.resolve())
	const mockOnVerifyChallenge = mock(() => Promise.resolve(true))

	const context = {
		wabe: {
			controllers: {
				database: {
					getObject: mockGetObject,
					updateObject: mockUpdateObject,
				},
			},
			config: {
				authentication: {
					session: {
						cookieSession: true,
					},
					customAuthenticationMethods: [
						{
							name: 'emailPassword',
							input: {
								email: { type: 'Email', required: true },
								password: { type: 'String', required: true },
							},
							provider: {
								onSignUp: mockOnSignUp,
								onSignIn: mockOnLogin,
							},
						},
						{
							name: 'emailOTP',
							input: {
								email: {
									type: 'Email',
									required: true,
								},
								code: {
									type: 'String',
									required: true,
								},
							},
							provider: {
								onSendChallenge: mockOnSendChallenge,
								onVerifyChallenge: mockOnVerifyChallenge,
							},
						},
					],
				},
			},
		},
	}

	afterEach(() => {
		mockCreateObject.mockClear()
		mockGetObject.mockClear()
		mockUpdateObject.mockClear()
		mockOnLogin.mockClear()
		mockOnSignUp.mockClear()
	})

	it('should call the secondary factor authentication on signIn', async () => {
		mockOnLogin.mockResolvedValueOnce({
			user: {
				id: 'id',
				// @ts-expect-error
				email: 'email@test.fr',
				secondFA: {
					enabled: true,
					provider: SecondaryFactor.EmailOTP,
				},
			},
		})

		const res = await signInWithResolver(
			{},
			{
				input: {
					authentication: {
						emailPassword: {
							email: 'email@test.fr',
							password: 'password',
						},
					},
				},
			},
			// @ts-expect-error
			context,
		)

		expect(mockOnLogin).toHaveBeenCalledTimes(1)
		expect(mockOnLogin).toHaveBeenCalledWith({
			input: {
				email: 'email@test.fr',
				password: 'password',
			},
			context: expect.any(Object),
		})

		expect(mockOnSendChallenge).toHaveBeenCalledTimes(1)
		expect(mockOnSendChallenge).toHaveBeenCalledWith({
			context: expect.any(Object),
			user: expect.objectContaining({
				email: 'email@test.fr',
			}),
		})

		expect(res).toEqual({
			accessToken: null,
			refreshToken: null,
			challengeToken: expect.any(String),
			user: {
				id: 'id',
				email: 'email@test.fr',
				secondFA: {
					enabled: true,
					// @ts-expect-error
					provider: SecondaryFactor.EmailOTP,
				},
			},
		})
	})

	it('should throw an error if no custom authentication configuration is provided', () => {
		expect(
			signInWithResolver(
				{},
				{
					input: {
						authentication: {
							emailPassword: {
								email: 'email@test.fr',
								password: 'password',
							},
						},
					},
				},
				{ wabe: { config: { authentication: undefined } } } as any,
			),
		).rejects.toThrow('No custom authentication methods found')
	})

	it('should throw an error if a custom authentication is provided but not in the custom authentication config', () => {
		expect(
			signInWithResolver(
				{},
				{
					input: {
						authentication: {
							emailPassword: {
								email: 'email@test.fr',
								password: 'password',
							},
						},
					},
				},
				{
					wabe: {
						config: {
							authentication: {
								customAuthenticationMethods: [
									{
										name: 'phonePassword',
										input: {
											email: {
												type: 'Email',
												required: true,
											},
											password: {
												type: 'String',
												required: true,
											},
										},
										provider: {
											onSignUp: mockOnSignUp,
											onSignIn: mockOnLogin,
										},
									},
								],
							},
						},
					},
				} as any,
			),
		).rejects.toThrow('No available custom authentication methods found')
	})

	it('should signInWith email and password when the user already exist (on cookieSession)', async () => {
		const mockCreateSession = spyOn(Session.prototype, 'create').mockResolvedValue({
			refreshToken: 'refreshToken',
			accessToken: 'accessToken',
			csrfToken: 'csrfToken',
		} as any)

		const mockSetCookie = mock(() => {})

		const mockResponse = {
			setCookie: mockSetCookie,
		}

		const res = await signInWithResolver(
			{},
			{
				input: {
					authentication: {
						emailPassword: {
							email: 'email@test.fr',
							password: 'password',
						},
					},
				},
			},
			{
				...context,
				response: mockResponse,
			} as any,
		)

		expect(res).toEqual({
			accessToken: 'accessToken',
			refreshToken: 'refreshToken',
			challengeToken: null,
			user: {
				id: 'id',
			},
			srp: undefined,
		})
		expect(mockOnLogin).toHaveBeenCalledTimes(1)
		expect(mockOnLogin).toHaveBeenCalledWith({
			input: {
				email: 'email@test.fr',
				password: 'password',
			},
			context: expect.any(Object),
		})

		expect(mockSetCookie).toHaveBeenCalledTimes(3)
		expect(mockSetCookie).toHaveBeenNthCalledWith(1, 'refreshToken', 'refreshToken', {
			httpOnly: true,
			path: '/',
			secure: true,
			sameSite: 'Strict',
			expires: expect.any(Date),
		})

		expect(mockSetCookie).toHaveBeenNthCalledWith(2, 'accessToken', 'accessToken', {
			httpOnly: true,
			path: '/',
			secure: true,
			sameSite: 'Strict',
			expires: expect.any(Date),
		})

		expect(mockSetCookie).toHaveBeenNthCalledWith(3, 'csrfToken', 'csrfToken', {
			httpOnly: true,
			path: '/',
			secure: true,
			sameSite: 'Strict',
			expires: expect.any(Date),
		})

		// @ts-expect-error
		const refreshTokenExpiresIn = mockSetCookie.mock.calls[0][2].expires
		// @ts-expect-error
		const accessTokenExpiresIn = mockSetCookie.mock.calls[1][2].expires

		// - 1000 to avoid flaky
		expect(refreshTokenExpiresIn.getTime() - Date.now()).toBeGreaterThanOrEqual(
			1000 * 7 * 24 * 60 * 60 - 1000,
		)
		expect(accessTokenExpiresIn.getTime() - Date.now()).toBeGreaterThanOrEqual(
			1000 * 15 * 60 - 1000,
		)

		expect(mockCreateSession).toHaveBeenCalledTimes(1)
		expect(mockCreateSession).toHaveBeenCalledWith('id', expect.anything())

		expect(mockOnSignUp).toHaveBeenCalledTimes(0)

		mockCreateSession.mockRestore()
	})
})
