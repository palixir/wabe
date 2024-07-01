import { describe, expect, it } from 'bun:test'
import { HookObject } from './HookObject'
import { OperationType } from '.'
import type { DevWibeAppTypes } from '../utils/helper'

describe('HookObject', () => {
	it('should return correctly value depends on the update state of the field', () => {
		const userData = { name: 'John Doe' }

		const hookObject = new HookObject<DevWibeAppTypes>({
			className: 'User',
			newData: userData,
			context: {} as any,
			operationType: OperationType.BeforeUpdate,
			object: {},
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
			object: {},
		})

		// @ts-expect-error
		hookObject.upsertNewData('name', 'tata')

		expect(hookObject.getNewData()).toEqual({
			name: 'tata',
			age: 30,
		})
	})

	it('should not set data for an after hook', () => {
		const userData = { name: 'John Doe', age: 30 }

		const hookObject = new HookObject({
			className: 'User',
			newData: userData as any,
			operationType: OperationType.AfterCreate,
			context: {} as any,
			object: {},
		})

		// @ts-expect-error
		expect(() => hookObject.upsertNewData('name', 'tata')).toThrow(
			'Cannot set data in a hook that is not a before hook',
		)

		expect(hookObject.getNewData()).toEqual({
			name: 'John Doe',
			age: 30,
		})
	})
})
