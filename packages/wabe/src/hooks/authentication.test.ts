import { mock, describe, expect, it, beforeEach } from 'bun:test'
import { HookObject } from './HookObject'
import { OperationType } from '.'
import { callAuthenticationProvider } from './authentication'

describe('Hooks authentication', () => {
	const mockSignUp = mock(() => ({}))

	const customAuthenticationMethods = [
		{
			name: 'emailPassword',
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
				onSignUp: mockSignUp,
			},
		},
	]

	beforeEach(() => {
		mockSignUp.mockClear()
	})

	it('should call the good one auth provider when create an user', async () => {
		const hookObject = new HookObject({
			className: 'User',
			context: {
				isRoot: true,
				wabe: {
					config: {
						authentication: {
							customAuthenticationMethods,
						},
					} as any,
					databaseController: {} as any,
				} as any,
			},
			object: {},
			operationType: OperationType.BeforeCreate,
			newData: {
				authentication: {
					emailPassword: {
						email: 'email@gmail.com',
						password: 'password',
					},
				},
			},
		})

		await callAuthenticationProvider(hookObject)

		expect(mockSignUp).toHaveBeenCalledTimes(1)
		expect(mockSignUp).toHaveBeenCalledWith({
			input: {
				email: 'email@gmail.com',
				password: 'password',
			},
			context: expect.any(Object),
		})
	})

	it('should call the good one auth provider when update an user', async () => {
		const hookObject = new HookObject({
			className: 'User',
			context: {
				isRoot: true,
				wabe: {
					config: {
						authentication: {
							customAuthenticationMethods,
						},
					} as any,
					databaseController: {} as any,
				} as any,
			},
			object: {},
			operationType: OperationType.BeforeUpdate,
			newData: {
				authentication: {
					emailPassword: {
						email: 'email@gmail.com',
						password: 'password',
					},
				},
			},
		})

		await callAuthenticationProvider(hookObject)

		expect(mockSignUp).toHaveBeenCalledTimes(1)
		expect(mockSignUp).toHaveBeenCalledWith({
			input: {
				email: 'email@gmail.com',
				password: 'password',
			},
			context: expect.any(Object),
		})
	})
})
