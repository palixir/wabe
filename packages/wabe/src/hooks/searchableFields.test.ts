import { describe, expect, it } from 'bun:test'
import {
	defaultSearchableFieldsBeforeCreate,
	defaultSearchableFieldsBeforeUpdate,
	stringExtraction,
} from './searchableFields'
import { HookObject } from './HookObject'
import type { DevWabeTypes } from '../utils/helper'
import { OperationType } from '.'

describe('searchablesFields', () => {
	it('should extract string correctly', () => {
		expect(stringExtraction('test')).toEqual(['t', 'te', 'tes', 'test'])

		expect(
			stringExtraction({
				test: 0,
				tata: 'ceci',
			}),
		).toEqual(['0', 'c', 'ce', 'cec', 'ceci'])

		expect(stringExtraction('es pace')).toEqual([
			'e',
			'es',
			'p',
			'pa',
			'pac',
			'pace',
		])
	})

	it('should complete the search fields of each object on insert', async () => {
		const hookObject = new HookObject<DevWabeTypes>({
			className: 'User',
			operationType: OperationType.BeforeCreate,
			newData: {
				email: 'email@test.fr',
				name: 'Test',
				age: 20,
			} as any,
			context: {
				wabe: {
					config: {
						schema: {
							classes: [
								{
									name: 'User',
									searchableFields: ['name', 'age'],
								},
							],
						},
					},
				},
			} as any,
			object: {} as any,
		})

		defaultSearchableFieldsBeforeCreate(hookObject)

		// @ts-expect-error
		expect(hookObject.getNewData().search).toEqual([
			't',
			'te',
			'tes',
			'test',
			'20',
		])
	})

	it('should complete the search fields of each object on update', async () => {
		const hookObject = new HookObject<DevWabeTypes>({
			className: 'User',
			operationType: OperationType.BeforeUpdate,
			newData: {
				email: 'email@test.fr',
				name: 'tata',
				age: 20,
			} as any,
			context: {
				wabe: {
					config: {
						schema: {
							classes: [
								{
									name: 'User',
									searchableFields: ['name', 'age'],
								},
							],
						},
					},
				},
			} as any,
			object: {
				name: 'test',
				search: ['t', 'te', 'tes', 'test'],
			} as any,
		})

		defaultSearchableFieldsBeforeUpdate(hookObject)

		// @ts-expect-error
		expect(hookObject.getNewData().search).toEqual([
			't',
			'ta',
			'tat',
			'tata',
			'20',
		])
	})
})
