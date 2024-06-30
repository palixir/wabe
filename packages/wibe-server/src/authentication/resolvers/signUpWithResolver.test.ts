import { describe, expect, it, beforeEach, mock, spyOn } from 'bun:test'
import { WibeApp } from '../../server'
import { signUpWithResolver } from './signUpWithResolver'
import { Session } from '../Session'

describe('SignUpWith', () => {
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
				email: 'email@com.fr',
				password: 'password',
			},
		}),
	)

	const mockCreateObject = mock(() => Promise.resolve({ id: 'userId' }))

	const mockDatabaseController = {
		createObject: mockCreateObject,
	}

	const config = {
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
			],
		},
	}

	const context = {
		databaseController: mockDatabaseController,
		config,
	} as any

	beforeEach(() => {
		mockCreateObject.mockClear()
		mockOnLogin.mockClear()
		mockOnSignUp.mockClear()
	})

	it('should throw an error if no custom authentication configuration is provided', async () => {
		expect(
			signUpWithResolver(
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
					config: {
						authentication: undefined,
						databaseController: mockDatabaseController,
					},
				} as any,
			),
		).rejects.toThrow('No custom authentication methods found')
	})

	it('should throw an error if a custom authentication is provided but not in the custom authentication config', async () => {
		expect(
			signUpWithResolver(
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
					config: {
						authentication: {
							customAuthenticationMethods: [
								{ name: 'phonePassword' },
							],
						},
					},
				} as any,
			),
		).rejects.toThrow('No available custom authentication methods found')
	})

	it('should signUpWith email and password when the user not exist', async () => {
		const mockCreateSession = spyOn(
			Session.prototype,
			'create',
		).mockResolvedValue({
			id: 'sessionId',
			refreshToken: 'refreshToken',
			accessToken: 'accessToken',
		} as any)

		const mockSetCookie = mock(() => {})

		const mockResponse = {
			setCookie: mockSetCookie,
		}

		const res = await signUpWithResolver(
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
				response: mockResponse,
				databaseController: mockDatabaseController,
				config,
			} as any,
		)

		expect(res).toEqual({
			refreshToken: 'refreshToken',
			accessToken: 'accessToken',
			id: 'userId',
		})
		expect(mockOnSignUp).toHaveBeenCalledTimes(1)
		expect(mockOnSignUp).toHaveBeenCalledWith({
			input: {
				email: 'email@test.fr',
				password: 'password',
			},
			context: expect.any(Object),
		})

		expect(mockCreateObject).toHaveBeenCalledTimes(1)
		expect(mockCreateObject).toHaveBeenCalledWith({
			className: 'User',
			data: {
				authentication: {
					emailPassword: {
						email: 'email@com.fr',
						password: 'password',
					},
				},
			},
			context: expect.any(Object),
		})

		expect(mockCreateSession).toHaveBeenCalledTimes(1)
		expect(mockCreateSession).toHaveBeenCalledWith(
			'userId',
			expect.any(Object),
		)

		expect(mockSetCookie).toHaveBeenCalledTimes(2)
		expect(mockSetCookie).toHaveBeenNthCalledWith(
			1,
			'refreshToken',
			'refreshToken',
			{
				httpOnly: true,
				path: '/',
				secure: false,
				expires: expect.any(Date),
			},
		)
		expect(mockSetCookie).toHaveBeenNthCalledWith(
			2,
			'accessToken',
			'accessToken',
			{
				httpOnly: true,
				path: '/',
				secure: false,
				expires: expect.any(Date),
			},
		)

		// @ts-expect-error
		const refreshTokenExpiresIn = mockSetCookie.mock.calls[0][2].expires
		// @ts-expect-error
		const accessTokenExpiresIn = mockSetCookie.mock.calls[1][2].expires

		// - 1000 to avoid flaky
		expect(
			new Date(refreshTokenExpiresIn).getTime(),
		).toBeGreaterThanOrEqual(Date.now() + 1000 * 30 * 24 * 60 * 60 - 1000)
		expect(new Date(accessTokenExpiresIn).getTime()).toBeGreaterThanOrEqual(
			Date.now() + 1000 * 15 * 60 - 1000,
		)

		expect(mockOnLogin).toHaveBeenCalledTimes(0)

		mockCreateSession.mockRestore()
	})
})
