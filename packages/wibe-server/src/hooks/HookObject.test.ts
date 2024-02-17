import { describe, expect, it } from 'bun:test'
import { HookObject } from './HookObject'
import { OperationType } from '.'

describe('HookObject', () => {
	it('should get data correctly', () => {
		const userData = { name: 'John Doe', age: 30 }

		const hookObject = new HookObject({
			className: '_User',
			object: { fields: userData },
			user: {
				id: '1',
				email: 'email@test.fr',
			},
			operationType: OperationType.BeforeInsert,
		})

		expect(hookObject.className).toEqual('_User')

		expect(hookObject.get({ field: 'name' })).toEqual('John Doe')
		expect(hookObject.get({ field: 'age' })).toEqual(30)
	})

	it('should create a clone of the data', () => {
		const userData = { name: 'John Doe', age: 30 }

		const hookObject = new HookObject({
			className: '_User',
			object: { fields: userData },
			user: {
				id: '1',
				email: 'email@test.fr',
			},
			operationType: OperationType.BeforeInsert,
		})

		hookObject.set({ field: 'name', value: 'tata' })

		expect(hookObject.get({ field: 'name' })).toEqual('tata')
		expect(userData.name).toEqual('John Doe')
	})

	it('should set data correctly', () => {
		const userData = { name: 'John Doe', age: 30 }

		const hookObject = new HookObject({
			className: '_User',
			object: { fields: userData },
			operationType: OperationType.BeforeInsert,
			user: {
				id: '1',
				email: 'email@test.fr',
			},
		})

		hookObject.set({ field: 'name', value: 'tata' })

		expect(hookObject.get({ field: 'name' })).toEqual('tata')
		expect(hookObject.get({ field: 'age' })).toEqual(30)
	})

	it('should not set data for an after hook', () => {
		const userData = { name: 'John Doe', age: 30 }

		const hookObject = new HookObject({
			className: '_User',
			object: { fields: userData },
			operationType: OperationType.AfterInsert,
			user: {
				id: '1',
				email: 'email@test.fr',
			},
		})

		expect(() => hookObject.set({ field: 'name', value: 'tata' })).toThrow(
			'Cannot set data in a hook that is not a before hook',
		)

		expect(hookObject.get({ field: 'name' })).toEqual('John Doe')
		expect(hookObject.get({ field: 'age' })).toEqual(30)
	})
})
