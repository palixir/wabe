import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import {
	defaultSearchableFieldsBeforeCreate,
	defaultSearchableFieldsBeforeUpdate,
	stringExtraction,
} from './searchableFields'
import { HookObject } from './HookObject'
import type { DevWabeTypes } from '../utils/helper'
import { setupTests, closeTests } from '../utils/testHelper'
import { OperationType } from '.'
import type { Wabe } from '../server'

describe('searchablesFields', () => {
	let wabe: Wabe<DevWabeTypes>

	beforeAll(async () => {
		const setup = await setupTests()
		wabe = setup.wabe
	})

	afterAll(async () => {
		await closeTests(wabe)
	})

	it('should extract searchable fields from email (searchableFields hook should be after emails hook)', async () => {
		await wabe.controllers.database.createObject({
			className: 'User',
			context: {
				isRoot: true,
				wabe,
			},
			data: {
				authentication: {
					emailPassword: {
						email: 'admin@wabe.dev',
						password: 'admin',
					},
				},
			},
			select: {},
		})

		const res = await wabe.controllers.database.getObjects({
			className: 'User',
			select: { search: true },
			context: {
				isRoot: true,
				wabe,
			},
		})

		expect(res[0]?.search).toEqual([
			'a',
			'ad',
			'adm',
			'admi',
			'admin',
			'w',
			'wa',
			'wab',
			'wabe',
			'd',
			'de',
			'dev',
		])
	})

	it('should extract string correctly', () => {
		expect(stringExtraction('test')).toEqual(['t', 'te', 'tes', 'test'])

		expect(
			stringExtraction({
				test: 0,
				tata: 'ceci',
			}),
		).toEqual(['0', 'c', 'ce', 'cec', 'ceci'])

		expect(stringExtraction('es pace')).toEqual(['e', 'es', 'p', 'pa', 'pac', 'pace'])
	})

	it('should complete the search fields of each object on insert', () => {
		const hookObject = new HookObject<DevWabeTypes, 'User'>({
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
			select: {},
		})

		defaultSearchableFieldsBeforeCreate(hookObject)

		expect(hookObject.getNewData().search).toEqual(['t', 'te', 'tes', 'test', '20'])
	})

	it('should complete the search fields of each object on update', () => {
		const hookObject = new HookObject<DevWabeTypes, 'User'>({
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
			select: {},
		})

		defaultSearchableFieldsBeforeUpdate(hookObject)

		expect(hookObject.getNewData().search).toEqual(['t', 'ta', 'tat', 'tata', '20'])
	})
})
