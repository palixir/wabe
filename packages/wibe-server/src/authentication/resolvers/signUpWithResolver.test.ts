import { describe, expect, it, beforeEach, mock, spyOn } from 'bun:test'
import { WibeApp } from '../../server'
import { signUpWithResolver } from './signUpWithResolver'
import type { Context } from '../../graphql/interface'
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

	beforeEach(() => {
		mockCreateObject.mockClear()
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
						provider: {
							onSignUp: mockOnSignUp,
							onSignIn: mockOnLogin,
							name: 'emailPassword',
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
					provider: {
						onSignUp: mockOnSignUp,
						onSignIn: mockOnLogin,
						name: 'phonePassword',
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
		const spyCreateSession = spyOn(
			Session.prototype,
			'create',
		).mockResolvedValue({ id: 'sessionId' } as any)

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
			{} as any,
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

		expect(mockCreateObject).toHaveBeenCalledTimes(1)
		expect(mockCreateObject).toHaveBeenCalledWith({
			className: '_User',
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

		expect(spyCreateSession).toHaveBeenCalledTimes(1)
		expect(spyCreateSession).toHaveBeenCalledWith(
			'userId',
			expect.any(Object),
		)

		expect(mockOnLogin).toHaveBeenCalledTimes(0)

		spyCreateSession.mockRestore()
	})
})
