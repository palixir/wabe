import { describe, expect, it } from 'bun:test'
import { HookObject } from './HookObject'
import { OperationType } from '.'

describe('HookObject', () => {
	it('should return correctly value depends on the update state of the field', () => {
		const userData = { name: 'John Doe' }

		const hookObject = new HookObject({
			className: 'User',
			newData: userData as any,
			context: {} as any,
			operationType: OperationType.BeforeUpdate,
		})

		// @ts-expect-error
		expect(hookObject.isFieldUpdate('name')).toBeTrue()
		// @ts-expect-error
		expect(hookObject.isFieldUpdate('age')).toBeFalse()
	})

	it('should create a clone of the data', () => {
		const userData = { name: 'John Doe', age: 30 }

		const hookObject = new HookObject({
			className: 'User',
			newData: userData as any,
			operationType: OperationType.BeforeCreate,
			context: {} as any,
		})

		// @ts-expect-error
		hookObject.upsertNewData('name', 'tata')

		expect(hookObject.getNewData()).toEqual({
			// @ts-expect-error
			name: 'tata',
			age: 30,
		})
	})

	it('should not set data for an after hook', () => {
		const userData = { name: 'John Doe', age: 30 }

		const hookObject = new HookObject({
			className: 'User',
			newData: userData as any,
			operationType: OperationType.AfterInsert,
			context: {} as any,
		})

		// @ts-expect-error
		expect(() => hookObject.upsertNewData('name', 'tata')).toThrow(
			'Cannot set data in a hook that is not a before hook',
		)

		expect(hookObject.getNewData()).toEqual({
			// @ts-expect-error
			name: 'John Doe',
			age: 30,
		})
	})
})
