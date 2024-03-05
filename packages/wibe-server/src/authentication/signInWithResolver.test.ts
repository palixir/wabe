import { describe, expect, it, beforeEach, mock } from 'bun:test'
import { WibeApp } from '../server'
import { signInWithResolver } from './signInWithResolver'
import { Context } from '../graphql/interface'

describe('SignInWith', () => {
	const mockOnLogin = mock(() =>
		Promise.resolve({
			dataToStore: {
				accessToken: 'accessToken',
				refreshToken: 'refreshToken',
			},
			user: {
				id: 'id',
			},
		}),
	)
	const mockOnSignUp = mock(() =>
		Promise.resolve({
			dataToStore: {
				accessToken: 'accessToken',
				refreshToken: 'refreshToken',
			},
			user: {
				id: 'id',
			},
		}),
	)

	const mockUpdateObject = mock(() => Promise.resolve({}))

	const mockDatabaseController = {
		updateObject: mockUpdateObject,
	}

	beforeEach(() => {
		mockUpdateObject.mockClear()
		mockOnLogin.mockClear()
		mockOnSignUp.mockClear()

		// @ts-expect-error
		WibeApp.databaseController = mockDatabaseController
		// @ts-expect-error
		WibeApp.config = {
			authentication: {
				customAuthenticationMethods: [
					{
						name: 'emailPassword',
						input: {
							email: { type: 'Email', required: true },
							password: { type: 'String', required: true },
						},
						dataToStore: {
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
	})

	it('should throw an error if no custom authentication configuration is provided', async () => {
		WibeApp.config.authentication = undefined

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
				{} as Context,
			),
		).rejects.toThrow('No custom authentication methods found')
	})

	it('should throw an error if a custom authentication is provided but not in the custom authentication config', async () => {
		WibeApp.config.authentication = {
			customAuthenticationMethods: [
				{
					name: 'phonePassword',
					input: {
						email: { type: 'Email', required: true },
						password: { type: 'String', required: true },
					},
					dataToStore: {
						email: { type: 'Email', required: true },
						password: { type: 'String', required: true },
					},
					provider: {
						onSignUp: mockOnSignUp,
						onSignIn: mockOnLogin,
					},
				},
			],
		}

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
				{} as Context,
			),
		).rejects.toThrow('No available custom authentication methods found')
	})

	it('should signInWith email and password when the user already exist', async () => {
		const mockAddCookie = mock(() => {})

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
				cookie: {
					access_token: {
						add: mockAddCookie,
					},
					refresh_token: {
						add: mockAddCookie,
					},
				},
			} as any,
		)

		expect(res).toBe(true)
		expect(mockOnLogin).toHaveBeenCalledTimes(1)
		expect(mockOnLogin).toHaveBeenCalledWith({
			input: {
				email: 'email@test.fr',
				password: 'password',
			},
			context: expect.anything(),
		})

		expect(mockUpdateObject).toHaveBeenCalledTimes(1)
		expect(mockUpdateObject).toHaveBeenCalledWith({
			className: '_User',
			id: 'id',
			data: {
				authentication: {
					emailPassword: {
						accessToken: 'accessToken',
						refreshToken: 'refreshToken',
					},
				},
			},
			context: expect.any(Object),
		})

		expect(mockOnSignUp).toHaveBeenCalledTimes(0)
	})
})
