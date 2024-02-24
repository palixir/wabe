import { describe, expect, it, beforeEach, mock } from 'bun:test'
import { WibeApp } from '../server'
import { signInWithResolver } from './signInWithResolver'
import { Context } from '../graphql/interface'

describe('SignInWith', () => {
	const mockOnLogin = mock(() =>
		Promise.resolve({
			accessToken: 'accessToken',
			refreshToken: 'refreshToken',
		}),
	)
	const mockOnSignUp = mock(() =>
		Promise.resolve({
			accessToken: 'accessToken',
			refreshToken: 'refreshToken',
		}),
	)
	const mockGetObjects = mock()
	const mockCreateObject = mock()
	const mockUpdateObject = mock()

	const mockDatabaseController = {
		getObjects: mockGetObjects,
		createObject: mockCreateObject,
		updateObject: mockUpdateObject,
	}

	beforeEach(() => {
		mockGetObjects.mockClear()
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
							identifier: { type: 'Email', required: true },
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

	it('should throw an error if no identifier is provided in the authentication method', async () => {
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
		).rejects.toThrow('No identifier provided')
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
								identifier: 'email@test.fr',
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
						identifier: { type: 'Email', required: true },
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
			signInWithResolver(
				{},
				{
					input: {
						authentication: {
							emailPassword: {
								identifier: 'email@test.fr',
								password: 'password',
							},
						},
					},
				},
				{} as Context,
			),
		).rejects.toThrow('No available custom authentication methods found')
	})

	it('should throw an error if more than on user is equal to the identifier', async () => {
		mockGetObjects.mockReturnValueOnce([{} as never, {} as never])

		expect(
			signInWithResolver(
				{},
				{
					input: {
						authentication: {
							emailPassword: {
								identifier: 'email@test.fr',
								password: 'password',
							},
						},
					},
				},
				{} as Context,
			),
		).rejects.toThrow('Multiple users found with the same identifier')
	})

	it('should signInWith email and password when the user already exist', async () => {
		const mockAddCookie = mock()

		mockGetObjects.mockReturnValueOnce([{ id: 'id' } as never])

		const res = await signInWithResolver(
			{},
			{
				input: {
					authentication: {
						emailPassword: {
							identifier: 'email@test.fr',
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
			} as Context,
		)

		expect(res).toBe(true)
		expect(mockOnLogin).toHaveBeenCalledTimes(1)
		expect(mockOnLogin).toHaveBeenCalledWith({
			input: {
				authentication: {
					emailPassword: {
						identifier: 'email@test.fr',
						password: 'password',
					},
				},
			},
			context: expect.anything(),
			userId: 'id',
		})

		expect(mockGetObjects).toHaveBeenCalledTimes(1)
		expect(mockGetObjects).toHaveBeenCalledWith({
			className: '_User',
			where: {
				authentication: {
					emailPassword: {
						identifier: { equalTo: 'email@test.fr' },
					},
				},
			},
		})

		expect(mockUpdateObject).toHaveBeenCalledTimes(1)
		expect(mockUpdateObject).toHaveBeenCalledWith({
			className: '_User',
			id: 'id',
			data: [
				{
					authentication: {
						emailPassword: {
							identifier: 'email@test.fr',
							password: 'password',
						},
					},
					refreshToken: 'refreshToken',
					accessToken: 'accessToken',
				},
			],
		})

		expect(mockAddCookie).toHaveBeenCalledTimes(2)
		expect(mockAddCookie).toHaveBeenNthCalledWith(1, {
			expires: expect.any(Date),
			httpOnly: true,
			path: '/',
			value: expect.any(String),
			sameSite: 'strict',
			secure: false,
		})

		expect(mockAddCookie).toHaveBeenNthCalledWith(2, {
			expires: expect.any(Date),
			httpOnly: true,
			path: '/',
			value: expect.any(String),
			sameSite: 'strict',
			secure: false,
		})

		expect(mockOnSignUp).toHaveBeenCalledTimes(0)
	})

	it('should signInWith email and password when the user not exist', async () => {
		const mockAddCookie = mock()

		mockGetObjects.mockReturnValueOnce([])

		const res = await signInWithResolver(
			{},
			{
				input: {
					authentication: {
						emailPassword: {
							identifier: 'email@test.fr',
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
			} as Context,
		)

		expect(res).toBe(true)

		expect(mockGetObjects).toHaveBeenCalledTimes(1)
		expect(mockGetObjects).toHaveBeenCalledWith({
			className: '_User',
			where: {
				authentication: {
					emailPassword: {
						identifier: { equalTo: 'email@test.fr' },
					},
				},
			},
		})

		expect(mockCreateObject).toHaveBeenCalledTimes(1)
		expect(mockCreateObject).toHaveBeenCalledWith({
			className: '_User',
			data: [
				{
					authentication: {
						emailPassword: {
							identifier: 'email@test.fr',
							password: 'password',
						},
					},
				},
			],
		})

		expect(mockOnLogin).toHaveBeenCalledTimes(0)
	})
})
