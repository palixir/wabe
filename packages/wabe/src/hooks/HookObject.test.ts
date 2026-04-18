import { describe, expect, it, beforeAll, afterAll } from 'bun:test'
import { HookObject } from './HookObject'
import { OperationType } from '.'
import type { DevWabeTypes } from '../utils/helper'
import { setupTests, closeTests } from '../utils/testHelper'
import type { Wabe } from '../server'

describe('HookObject', () => {
	let wabe: Wabe<DevWabeTypes>

	beforeAll(async () => {
		const setup = await setupTests([
			{
				name: 'TestDocument',
				fields: {
					name: { type: 'String' },
				},
				permissions: {
					read: { requireAuthentication: false },
					create: { requireAuthentication: false },
					update: { requireAuthentication: false },
					delete: { requireAuthentication: false },
				},
			},
			{
				name: 'TestPointerContainer',
				fields: {
					document: { type: 'Pointer', class: 'TestDocument' },
					documents: { type: 'Relation', class: 'TestDocument' },
				},
				permissions: {
					read: { requireAuthentication: false },
					create: { requireAuthentication: false },
					update: { requireAuthentication: false },
					delete: { requireAuthentication: false },
				},
			},
		])
		wabe = setup.wabe
	})

	afterAll(async () => {
		await closeTests(wabe)
	})

	it('should fetch a pointer field and mutate the object with the resolved value', async () => {
		const database = wabe.controllers.database as any

		const document = await database.createObject({
			className: 'TestDocument',
			data: { name: 'My Document' },
			context: { wabe, isRoot: true },
			select: { id: true },
		})

		const container = await database.createObject({
			className: 'TestPointerContainer',
			data: { document: document?.id },
			context: { wabe, isRoot: true },
			select: { id: true, document: true },
		})

		const hookObject = new HookObject<DevWabeTypes, any>({
			className: 'TestPointerContainer',
			newData: {} as any,
			context: { wabe } as any,
			operationType: OperationType.AfterCreate,
			object: {
				id: container?.id,
				document: container?.document,
			} as any,
			select: {},
		})

		const result = await hookObject.fetchPointerOrRelation('document')

		expect(result).toEqual(
			expect.objectContaining({
				id: document?.id,
				name: 'My Document',
			}),
		)

		expect((hookObject.object as any)?.document).toEqual(
			expect.objectContaining({
				id: document?.id,
				name: 'My Document',
			}),
		)
	})

	it('should fetch a relation field and mutate the object with the resolved values', async () => {
		const database = wabe.controllers.database as any

		const doc1 = await database.createObject({
			className: 'TestDocument',
			data: { name: 'Doc 1' },
			context: { wabe, isRoot: true },
			select: { id: true },
		})

		const doc2 = await database.createObject({
			className: 'TestDocument',
			data: { name: 'Doc 2' },
			context: { wabe, isRoot: true },
			select: { id: true },
		})

		const container = await database.createObject({
			className: 'TestPointerContainer',
			data: { documents: [doc1?.id, doc2?.id] },
			context: { wabe, isRoot: true },
			select: { id: true, documents: true },
		})

		const hookObject = new HookObject<DevWabeTypes, any>({
			className: 'TestPointerContainer',
			newData: {} as any,
			context: { wabe } as any,
			operationType: OperationType.AfterCreate,
			object: {
				id: container?.id,
				documents: container?.documents,
			} as any,
			select: {},
		})

		const result = await hookObject.fetchPointerOrRelation('documents')

		expect(Array.isArray(result)).toBeTrue()
		expect(result).toHaveLength(2)
		expect(result).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: doc1?.id, name: 'Doc 1' }),
				expect.objectContaining({ id: doc2?.id, name: 'Doc 2' }),
			]),
		)

		expect((hookObject.object as any)?.documents).toEqual(result)
	})

	it('should respect the select option when fetching a pointer field', async () => {
		const database = wabe.controllers.database as any

		const document = await database.createObject({
			className: 'TestDocument',
			data: { name: 'Selective' },
			context: { wabe, isRoot: true },
			select: { id: true },
		})

		const container = await database.createObject({
			className: 'TestPointerContainer',
			data: { document: document?.id },
			context: { wabe, isRoot: true },
			select: { id: true, document: true },
		})

		const hookObject = new HookObject<DevWabeTypes, any>({
			className: 'TestPointerContainer',
			newData: {} as any,
			context: { wabe } as any,
			operationType: OperationType.AfterCreate,
			object: {
				id: container?.id,
				document: container?.document,
			} as any,
			select: {},
		})

		const result = await hookObject.fetchPointerOrRelation('document', {
			select: { name: true },
		})

		expect(result).toEqual({ name: 'Selective' } as any)

		const hookObjectWithId = new HookObject<DevWabeTypes, any>({
			className: 'TestPointerContainer',
			newData: {} as any,
			context: { wabe } as any,
			operationType: OperationType.AfterCreate,
			object: {
				id: container?.id,
				document: container?.document,
			} as any,
			select: {},
		})

		const resultWithId = await hookObjectWithId.fetchPointerOrRelation('document', {
			select: { id: true, name: true },
		})

		expect(resultWithId).toEqual({ id: document?.id, name: 'Selective' } as any)
	})

	it('should throw when trying to fetch a non Pointer/Relation field at runtime', async () => {
		const hookObject = new HookObject<DevWabeTypes, any>({
			className: 'TestPointerContainer',
			newData: {} as any,
			context: { wabe } as any,
			operationType: OperationType.AfterCreate,
			object: { id: 'container-id' } as any,
			select: {},
		})

		await expect(hookObject.fetchPointerOrRelation('name' as any)).rejects.toThrow(
			'Field "name" is not a Pointer or Relation',
		)
	})

	it('should throw when trying to fetch an unsafe field key', async () => {
		const hookObject = new HookObject<DevWabeTypes, any>({
			className: 'TestPointerContainer',
			newData: {} as any,
			context: { wabe } as any,
			operationType: OperationType.AfterCreate,
			object: { id: 'container-id' } as any,
			select: {},
		})

		await expect(hookObject.fetchPointerOrRelation('__proto__' as any)).rejects.toThrow(
			'Cannot fetch unsafe field key "__proto__"',
		)
	})

	it('should return correctly value depends on the update state of the field', () => {
		const userData = { name: 'John Doe' }

		const hookObject = new HookObject<DevWabeTypes, 'User'>({
			className: 'User',
			// @ts-expect-error
			newData: userData,
			context: {} as any,
			operationType: OperationType.BeforeUpdate,
			object: {
				id: '1',
			},
			select: {},
		})

		expect(hookObject.isFieldUpdated('name')).toBeTrue()
		expect(hookObject.isFieldUpdated('age')).toBeFalse()
	})

	it('should mark fields as updated even when new value is falsy', () => {
		const hookObject = new HookObject<DevWabeTypes, 'User'>({
			className: 'User',
			newData: {
				age: 0,
				verified: false,
				name: '',
			} as any,
			context: {} as any,
			operationType: OperationType.BeforeUpdate,
			object: {
				id: '1',
			},
			select: {},
		})

		expect(hookObject.isFieldUpdated('age')).toBeTrue()
		expect(hookObject.isFieldUpdated('verified' as any)).toBeTrue()
		expect(hookObject.isFieldUpdated('name')).toBeTrue()
	})

	it('should create a clone of the data', () => {
		const userData = { name: 'John Doe', age: 30 }

		const hookObject = new HookObject<DevWabeTypes, 'User'>({
			className: 'User',
			newData: userData as any,
			operationType: OperationType.BeforeCreate,
			context: {} as any,
			object: {
				id: '1',
			},
			select: {},
		})

		hookObject.upsertNewData('name', 'tata')

		expect(hookObject.getNewData()).toEqual(
			expect.objectContaining({
				name: 'tata',
				age: 30,
			}),
		)
	})

	it('should not set data for an after hook', () => {
		const userData = { name: 'John Doe', age: 30 }

		const hookObject = new HookObject({
			className: 'User',
			newData: userData as any,
			operationType: OperationType.AfterCreate,
			context: {} as any,
			object: {
				id: '1',
			},
			select: {},
		})

		expect(() => hookObject.upsertNewData('name', 'tata')).toThrow(
			'Cannot set data in a hook that is not a before hook',
		)

		expect(hookObject.getNewData()).toEqual({
			name: 'John Doe',
			age: 30,
		})
	})

	it('should reject unsafe field keys when upserting data', () => {
		const userData = { name: 'John Doe', age: 30 }

		const hookObject = new HookObject({
			className: 'User',
			newData: userData as any,
			operationType: OperationType.BeforeCreate,
			context: {} as any,
			object: {
				id: '1',
			},
			select: {},
		})

		expect(() => hookObject.upsertNewData('__proto__' as any, 'tata')).toThrow(
			'Cannot set unsafe field key "__proto__"',
		)
	})

	it('should normalize pointer and relation IDs in getNewData', () => {
		const hookObject = new HookObject<DevWabeTypes, any>({
			className: 'TestPointerContainer',
			newData: {
				document: 'document-id',
				documents: ['document-id', 'document-id-2'],
			} as any,
			context: { wabe } as any,
			operationType: OperationType.BeforeCreate,
			object: {
				id: 'container-id',
			} as any,
			select: {},
		})

		expect(hookObject.getNewData()).toEqual(
			expect.objectContaining({
				document: {
					class: 'TestDocument',
					id: 'document-id',
					type: 'Pointer',
				},
				documents: {
					class: 'TestDocument',
					ids: ['document-id', 'document-id-2'],
					type: 'Relation',
				},
			}),
		)
	})

	it('should normalize pointer values set through upsertNewData', () => {
		const hookObject = new HookObject<DevWabeTypes, any>({
			className: 'TestPointerContainer',
			newData: {} as any,
			context: { wabe } as any,
			operationType: OperationType.BeforeUpdate,
			object: {
				id: 'container-id',
			} as any,
			select: {},
		})

		hookObject.upsertNewData('document', 'document-id')
		hookObject.upsertNewData('documents', ['document-id', 'document-id-2'])

		expect(hookObject.getNewData()).toEqual(
			expect.objectContaining({
				document: {
					class: 'TestDocument',
					id: 'document-id',
					type: 'Pointer',
				},
				documents: {
					class: 'TestDocument',
					ids: ['document-id', 'document-id-2'],
					type: 'Relation',
				},
			}),
		)
	})
})
