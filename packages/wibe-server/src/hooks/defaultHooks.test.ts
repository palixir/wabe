import {
	describe,
	expect,
	it,
	beforeAll,
	mock,
	afterEach,
	spyOn,
} from 'bun:test'
import { WibeApp } from '..'
import {
	defaultAfterInsertToCallSignUpEvent,
	defaultBeforeInsertForCreatedAt,
	defaultBeforeInsertForDefaultValue,
	defaultBeforeUpdateForUpdatedAt,
} from './defaultHooks'
import { HookObject } from './HookObject'
import { OperationType } from '.'

describe('Default hooks', () => {
	const now = new Date()

	describe('CreatedAt and UpdatedAt', () => {
		it('should add createdAt and updatedAt value on insert operation type', async () => {
			const hookObject = new HookObject<'_User'>({
				className: '_User',
				operationType: OperationType.BeforeInsert,
				object: {
					email: 'email@test.fr',
				} as any,
			})

			const spyHookObjectSet = spyOn(hookObject, 'set')

			await defaultBeforeInsertForCreatedAt(hookObject)

			expect(spyHookObjectSet).toHaveBeenCalledTimes(2)
			expect(spyHookObjectSet).toHaveBeenNthCalledWith(1, {
				field: 'createdAt',
				value: expect.any(Date),
			})
			expect(spyHookObjectSet).toHaveBeenNthCalledWith(2, {
				field: 'updatedAt',
				value: expect.any(Date),
			})

			const createdAt = spyHookObjectSet.mock.calls[0][0].value

			expect(createdAt.getDay()).toEqual(now.getDay())
			expect(createdAt.getMonth()).toEqual(now.getMonth())
			expect(createdAt.getFullYear()).toEqual(now.getFullYear())

			const updatedAt = spyHookObjectSet.mock.calls[1][0].value
			expect(updatedAt.getDay()).toEqual(now.getDay())
			expect(updatedAt.getMonth()).toEqual(now.getMonth())
			expect(updatedAt.getFullYear()).toEqual(now.getFullYear())
		})

		it('shoud add updatedAt value on update operation type', async () => {
			const hookObject = new HookObject<'_User'>({
				className: '_User',
				operationType: OperationType.BeforeUpdate,
				object: {
					email: 'email@test.fr',
				} as any,
			})

			const spyHookObjectSet = spyOn(hookObject, 'set')

			await defaultBeforeUpdateForUpdatedAt(hookObject)
			expect(spyHookObjectSet).toHaveBeenCalledTimes(1)
			expect(spyHookObjectSet).toHaveBeenCalledWith({
				field: 'updatedAt',
				value: expect.any(Date),
			})

			const updatedAt = spyHookObjectSet.mock.calls[0][0].value

			// Don't test hours to avoid flaky
			expect(updatedAt.getDay()).toEqual(now.getDay())
			expect(updatedAt.getMonth()).toEqual(now.getMonth())
			expect(updatedAt.getFullYear()).toEqual(now.getFullYear())
		})
	})

	describe('Default value', () => {
		beforeAll(() => {
			WibeApp.config = {
				schema: {
					class: [
						{
							name: '_User',
							fields: {
								name: { type: 'String' },
								age: { type: 'Int' },
								isAdmin: {
									type: 'Boolean',
									defaultValue: false,
								},
							},
						},
					],
				},
			} as any
		})

		it('should add the value if a default value is defined in schema but not specified', async () => {
			const hookObject = new HookObject<'_User'>({
				className: '_User',
				operationType: OperationType.BeforeInsert,
				object: {
					id: 'id',
					email: 'email@test.fr',
				} as any,
			})

			const spyHookObjectSet = spyOn(hookObject, 'set')

			await defaultBeforeInsertForDefaultValue(hookObject)

			expect(spyHookObjectSet).toHaveBeenCalledTimes(1)
		})

		it('should not add a default value if a value is specified', async () => {
			const hookObject = new HookObject<'_User'>({
				className: '_User',
				operationType: OperationType.BeforeInsert,
				object: {
					id: 'id',
					email: 'email@test.fr',
					isAdmin: true,
				} as any,
			})

			const spyHookObjectSet = spyOn(hookObject, 'set')

			await defaultBeforeInsertForDefaultValue(hookObject)

			expect(spyHookObjectSet).toHaveBeenCalledTimes(0)
		})
	})

	describe('Call signup on create_User', () => {
		const mockOnSignUp = mock(() => Promise.resolve({}))

		beforeAll(() => {
			WibeApp.config.authentication = {
				customAuthenticationMethods: [
					{
						name: 'emailPassword',
						input: {
							identifier: { type: 'Email', required: true },
							password: { type: 'String', required: true },
						},
						events: {
							onSignUp: mockOnSignUp,
							onLogin: () => {
								return Promise.resolve({})
							},
						},
					},
				],
			}
		})

		afterEach(() => {
			mockOnSignUp.mockClear()
		})

		it('should call signUp event on create_User', async () => {
			const hookObject = new HookObject<'_User'>({
				className: '_User',
				operationType: OperationType.AfterInsert,
				object: {
					id: 'id',
					authentication: {
						emailPassword: {
							identifier: 'email@test.fr',
							password: 'password',
						},
					},
				} as any,
			})

			await defaultAfterInsertToCallSignUpEvent(hookObject, {} as any)

			expect(mockOnSignUp).toHaveBeenCalledTimes(1)
			expect(mockOnSignUp).toHaveBeenCalledWith({
				context: expect.any(Object),
				input: {
					emailPassword: {
						identifier: 'email@test.fr',
						password: 'password',
					},
				},
				userId: 'id',
			})
		})

		it('should not call signUp event on create_User when authentication is not provided', async () => {
			const hookObject = new HookObject<'_User'>({
				className: '_User',
				operationType: OperationType.AfterInsert,
				object: {
					id: 'id',
					authentication: {
						phonePassword: {
							identifier: 'email@test.fr',
							password: 'password',
						},
					},
				} as any,
			})

			expect(
				defaultAfterInsertToCallSignUpEvent(hookObject, {} as any),
			).rejects.toThrow(
				'No available custom authentication methods found',
			)

			expect(mockOnSignUp).toHaveBeenCalledTimes(0)
		})
	})
})
