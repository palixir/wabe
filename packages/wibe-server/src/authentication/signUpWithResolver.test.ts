import { describe, expect, it, beforeEach, mock } from 'bun:test'
import { WibeApp } from '../server'
import { signUpWithResolver } from './signUpWithResolver'
import { Context } from '../graphql/interface'

describe('SignUpWith', () => {
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
						events: {
							onSignUp: mockOnSignUp,
							onLogin: mockOnLogin,
						},
					},
				],
			},
		}
	})

	it('should throw an error if no custom authentication configuration is provided', async () => {
		WibeApp.config.authentication = undefined

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
					events: {
						onSignUp: mockOnSignUp,
						onLogin: mockOnLogin,
					},
				},
			],
		}

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
				{} as Context,
			),
		).rejects.toThrow('No available custom authentication methods found')
	})

	it('should signUpWith email and password when the user not exist', async () => {
		const mockAddCookie = mock(() => {})

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
		expect(mockOnSignUp).toHaveBeenCalledTimes(1)
		expect(mockOnSignUp).toHaveBeenCalledWith({
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

		expect(mockOnLogin).toHaveBeenCalledTimes(0)
	})
})
