import { describe, expect, it, beforeEach, mock, spyOn } from 'bun:test'
import { WibeApp } from '../../server'
import { signInWithResolver } from './signInWithResolver'
import { Context } from '../../graphql/interface'
import { Session } from '../Session'

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

	const mockOnSendChallenge = mock(() => Promise.resolve())
	const mockOnVerifyChallenge = mock(() => Promise.resolve(true))

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
					{
						name: 'otp',
						input: {
							code: {
								type: 'String',
								required: true,
							},
						},
						provider: {
							onSendChallenge: mockOnSendChallenge,
							onVerifyChallenge: mockOnVerifyChallenge,
							name: 'otp',
						},
					},
				],
			},
		}
	})

	it('should call the secondary factor authentication on signIn', async () => {
		const res = await signInWithResolver(
			{},
			{
				input: {
					authentication: {
						emailPassword: {
							email: 'email@test.fr',
							password: 'password',
						},
						// @ts-expect-error
						secondaryFactor: 'otp', // Use hardcoded value to avoid dependency on the generated code
					},
				},
			},
			{} as any,
		)

		expect(mockOnLogin).toHaveBeenCalledTimes(1)
		expect(mockOnLogin).toHaveBeenCalledWith({
			input: {
				email: 'email@test.fr',
				password: 'password',
			},
			context: expect.anything(),
		})

		expect(mockOnSendChallenge).toHaveBeenCalledTimes(1)

		expect(res).toBe(true)
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
					provider: {
						onSignUp: mockOnSignUp,
						onSignIn: mockOnLogin,
						name: 'phonePassword',
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
		const spyCreateSession = spyOn(
			Session.prototype,
			'create',
		).mockResolvedValue({} as any)

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
			{} as any,
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

		expect(spyCreateSession).toHaveBeenCalledTimes(1)
		expect(spyCreateSession).toHaveBeenCalledWith('id', expect.anything())

		expect(mockOnSignUp).toHaveBeenCalledTimes(0)

		spyCreateSession.mockRestore()
	})
})
