import {
	describe,
	it,
	expect,
	beforeAll,
	afterAll,
	beforeEach,
	spyOn,
	afterEach,
} from 'bun:test'
import { fail } from 'assert'
import { ObjectId } from 'mongodb'
import { closeTests, setupTests } from '../../utils/helper'
import { MongoAdapter, buildMongoWhereQuery } from './MongoAdapter'
import { WibeApp } from '../../server'
import * as hooks from '../../hooks'

describe('Mongo adapter', () => {
	let mongoAdapter: MongoAdapter
	let wibe: WibeApp

	const spyFindHooksAndExecute = spyOn(hooks, 'findHooksAndExecute')

	beforeAll(async () => {
		const setup = await setupTests()
		wibe = setup.wibe

		mongoAdapter = WibeApp.databaseController.adapter as MongoAdapter
	})

	afterAll(async () => {
		await closeTests(wibe)
	})

	beforeEach(async () => {
		const collections = await mongoAdapter.database?.collections()

		if (collections)
			await Promise.all(
				collections?.map((collection) => collection.drop()),
			)
	})

	afterEach(() => {
		spyFindHooksAndExecute.mockClear()
	})

	it('should create class', async () => {
		if (!mongoAdapter.database) fail()

		const spyCollection = spyOn(
			mongoAdapter.database,
			'collection',
		).mockReturnValue({} as any)

		await mongoAdapter.createClassIfNotExist('_User')

		expect(spyCollection).toHaveBeenCalledTimes(1)
		expect(spyCollection).toHaveBeenCalledWith('_User')

		spyCollection.mockRestore()
	})

	it("should not create class if it's not connected", async () => {
		const cloneMongoAdapter = Object.assign(
			Object.create(Object.getPrototypeOf(mongoAdapter)),
			mongoAdapter,
		)
		cloneMongoAdapter.database = undefined

		expect(
			cloneMongoAdapter.createClassIfNotExist('_User'),
		).rejects.toThrow('Connection to database is not established')
	})

	it('should getObjects using id and not _id', async () => {
		const insertedObjects = await mongoAdapter.createObjects({
			className: '_User',
			data: [
				{
					name: 'Lucas',
					age: 20,
				},
				{
					name: 'Lucas1',
					age: 20,
				},
			],
			fields: ['name', 'id'],
			context: { user: {} } as any,
		})

		if (!insertedObjects) fail()

		const res = await mongoAdapter.getObjects({
			className: '_User',
			where: {
				id: { equalTo: new ObjectId(insertedObjects[0].id) },
			},
		})

		expect(res.length).toEqual(1)
	})

	it('should getObjects with limit and offset', async () => {
		await mongoAdapter.createObjects({
			className: '_User',
			data: [
				{
					name: 'John',
					age: 20,
				},
				{
					name: 'John1',
					age: 20,
				},
				{
					name: 'John2',
					age: 20,
				},
				{
					name: 'John3',
					age: 20,
				},
				{
					name: 'John4',
					age: 20,
				},
			],
			fields: ['name', 'id'],
			context: { user: {} } as any,
		})

		const res = await mongoAdapter.getObjects({
			className: '_User',
			fields: ['name'],
			limit: 2,
			offset: 2,
		})

		expect(res.length).toEqual(2)
		expect(res[0].name).toEqual('John2')
		expect(res[1].name).toEqual('John3')
	})

	it('should get all the objects with limit', async () => {
		const res = await mongoAdapter.createObjects({
			className: '_User',
			data: [
				{
					name: 'John',
					age: 20,
				},
				{
					name: 'John1',
					age: 20,
				},
				{
					name: 'John2',
					age: 20,
				},
				{
					name: 'John3',
					age: 20,
				},
				{
					name: 'John4',
					age: 20,
				},
			],
			fields: ['name', 'id'],
			limit: 2,
			context: { user: {} } as any,
		})

		expect(res.length).toEqual(2)
	})

	// For the moment we keep the mongodb behavior for the negative value (for limit)
	// https://www.mongodb.com/docs/manual/reference/method/cursor.limit/#negative-values
	it('should get all the objects with negative limit and offset', async () => {
		const res = await mongoAdapter.createObjects({
			className: '_User',
			data: [
				{
					name: 'John',
					age: 20,
				},
				{
					name: 'John1',
					age: 20,
				},
				{
					name: 'John2',
					age: 20,
				},
				{
					name: 'John3',
					age: 20,
				},
				{
					name: 'John4',
					age: 20,
				},
			],
			fields: ['name', 'id'],
			limit: -2,
			context: { user: {} } as any,
		})

		expect(res.length).toEqual(2)

		expect(
			mongoAdapter.createObjects({
				className: '_User',
				data: [
					{
						name: 'John',
						age: 20,
					},
					{
						name: 'John1',
						age: 20,
					},
					{
						name: 'John2',
						age: 20,
					},
					{
						name: 'John3',
						age: 20,
					},
					{
						name: 'John4',
						age: 20,
					},
				],
				fields: ['name', 'id'],
				offset: -2,
				context: { user: {} } as any,
			}),
		).rejects.toThrow(
			"BSON field 'skip' value must be >= 0, actual value '-2'",
		)
	})

	it('should get all the objects without limit and without offset', async () => {
		await mongoAdapter.createObjects({
			className: '_User',
			data: [
				{
					name: 'John',
					age: 20,
				},
				{
					name: 'John1',
					age: 20,
				},
				{
					name: 'John2',
					age: 20,
				},
				{
					name: 'John3',
					age: 20,
				},
				{
					name: 'John4',
					age: 20,
				},
			],
			fields: ['name', 'id'],
			context: { user: {} } as any,
		})

		const res = await mongoAdapter.getObjects({
			className: '_User',
			fields: ['name'],
		})

		expect(res.length).toEqual(5)
	})

	it('should createObjects and deleteObjects with offset and limit', async () => {
		const res = await mongoAdapter.createObjects({
			className: '_User',
			data: [
				{
					name: 'John',
					age: 20,
				},
				{
					name: 'John1',
					age: 20,
				},
				{
					name: 'John2',
					age: 20,
				},
				{
					name: 'John3',
					age: 20,
				},
				{
					name: 'John4',
					age: 20,
				},
			],
			fields: ['name', 'id'],
			limit: 2,
			offset: 2,
			context: { user: {} } as any,
		})

		expect(res.length).toEqual(2)
		expect(res[0].name).toEqual('John2')
		expect(res[1].name).toEqual('John3')

		const res2 = await mongoAdapter.deleteObjects({
			className: '_User',
			where: {
				OR: [
					{ name: { equalTo: 'John2' } },
					{ name: { equalTo: 'John3' } },
					{ name: { equalTo: 'John4' } },
				],
			},
			fields: ['name'],
			limit: 2,
			offset: 1,
			context: { user: {} } as any,
		})

		expect(res2.length).toEqual(2)
		expect(res2[0].name).toEqual('John3')
		expect(res2[1].name).toEqual('John4')
	})

	it('should get the _id of an object', async () => {
		const insertedObject = await mongoAdapter.createObject({
			className: '_User',
			data: {
				name: 'John',
				age: 20,
			},
			fields: ['name', 'id'],
			context: { user: {} } as any,
		})

		const res = await mongoAdapter.getObject({
			id: insertedObject?.id.toString(),
			className: '_User',
			fields: ['id'],
		})

		expect(res?.id).toEqual(insertedObject?.id)

		const res2 = await mongoAdapter.getObject({
			id: insertedObject?.id.toString(),
			className: '_User',
			fields: ['name'],
		})

		// @ts-ignore
		expect(res2.id).toEqual(undefined)
	})

	it('should get one object with specific field and * fields', async () => {
		const insertedObject = await mongoAdapter.createObject({
			className: '_User',
			data: {
				name: 'John',
				age: 20,
			},
			fields: ['name', 'id'],
			context: { user: {} } as any,
		})

		if (!insertedObject) fail()

		const id = insertedObject.id

		expect(id).toBeDefined()

		const field = await mongoAdapter.getObject({
			className: '_User',
			id: id.toString(),
			fields: ['name'],
		})

		expect(field).toEqual({
			name: 'John',
		})
	})

	it('should get all object with specific field and * fields', async () => {
		const objects = await mongoAdapter.getObjects({
			className: '_User',
			fields: ['name'],
		})

		expect(objects.length).toEqual(0)

		await mongoAdapter.createObject({
			className: '_User',
			data: {
				name: 'John1',
				age: 20,
			},
			fields: ['name'],
			context: { user: {} } as any,
		})

		await mongoAdapter.createObject({
			className: '_User',
			data: {
				name: 'John2',
				age: 20,
			},
			fields: ['name'],
			context: { user: {} } as any,
		})

		const objects2 = await mongoAdapter.getObjects({
			className: '_User',
			fields: ['name', 'id'],
		})

		expect(objects2.length).toEqual(2)
		expect(objects2).toEqual([
			{
				id: expect.any(String),
				name: 'John1',
			},
			{
				id: expect.any(String),
				name: 'John2',
			},
		])

		const objects3 = await mongoAdapter.getObjects({
			className: '_User',
			fields: ['name', 'id', 'age'],
		})

		expect(objects3.length).toEqual(2)
		expect(objects3).toEqual([
			{
				id: expect.any(String),
				name: 'John1',
				age: 20,
			},
			{
				id: expect.any(String),
				name: 'John2',
				age: 20,
			},
		])
	})

	it('should get all objects with where filter', async () => {
		await mongoAdapter.createObject({
			className: '_User',
			data: {
				name: 'John1',
				age: 20,
			},
			fields: ['name'],
			context: { user: {} } as any,
		})

		await mongoAdapter.createObject({
			className: '_User',
			data: {
				name: 'John2',
				age: 20,
			},
			fields: ['name'],
			context: { user: {} } as any,
		})

		// OR statement
		expect(
			await mongoAdapter.getObjects({
				className: '_User',
				where: {
					OR: [
						{
							name: { equalTo: 'John1' },
						},
						{
							name: { equalTo: 'John2' },
						},
					],
				},
				fields: ['name', 'id', 'age'],
			}),
		).toEqual([
			{
				id: expect.any(String),
				name: 'John1',
				age: 20,
			},
			{
				id: expect.any(String),
				name: 'John2',
				age: 20,
			},
		])

		expect(
			await mongoAdapter.getObjects({
				className: '_User',
				where: {
					OR: [
						{
							name: { equalTo: 'John1' },
						},
						{
							name: { equalTo: 'John3' },
						},
					],
				},
				fields: ['name', 'id', 'age'],
			}),
		).toEqual([
			{
				id: expect.any(String),
				name: 'John1',
				age: 20,
			},
		])

		// AND statement
		expect(
			await mongoAdapter.getObjects({
				className: '_User',
				where: {
					AND: [
						{
							name: { equalTo: 'John1' },
						},
						{
							age: { equalTo: 20 },
						},
					],
				},
				fields: ['name', 'id', 'age'],
			}),
		).toEqual([
			{
				id: expect.any(String),
				name: 'John1',
				age: 20,
			},
		])

		expect(
			await mongoAdapter.getObjects({
				className: '_User',
				where: {
					AND: [
						{
							name: { equalTo: 'John1' },
						},
						{
							age: { equalTo: 10 },
						},
					],
				},
			}),
		).toEqual([])

		// Equal to statement
		expect(
			await mongoAdapter.getObjects({
				className: '_User',
				where: {
					name: { equalTo: 'John1' },
				},
				fields: ['name', 'id', 'age'],
			}),
		).toEqual([
			{
				id: expect.any(String),
				name: 'John1',
				age: 20,
			},
		])

		expect(
			await mongoAdapter.getObjects({
				className: '_User',
				where: {
					age: { greaterThan: 21 },
				},
			}),
		).toEqual([])

		// Not equal to statement
		expect(
			await mongoAdapter.getObjects({
				className: '_User',
				where: {
					name: { notEqualTo: 'John1' },
				},
				fields: ['name', 'id', 'age'],
			}),
		).toEqual([
			{
				id: expect.any(String),
				name: 'John2',
				age: 20,
			},
		])

		// Less than statement on string (not implemented)
		expect(
			await mongoAdapter.getObjects({
				className: '_User',
				where: {
					name: { lessThan: 'John1' },
				},
			}),
		).toEqual([])

		// Less than to statement on number
		expect(
			await mongoAdapter.getObjects({
				className: '_User',
				where: {
					age: { lessThan: 30 },
				},
				fields: ['name', 'id', 'age'],
			}),
		).toEqual([
			{
				id: expect.any(String),
				name: 'John1',
				age: 20,
			},
			{
				id: expect.any(String),
				name: 'John2',
				age: 20,
			},
		])

		// Equal to statement on number
		expect(
			await mongoAdapter.getObjects({
				className: '_User',
				where: {
					age: { equalTo: 20 },
				},
				fields: ['name', 'id', 'age'],
			}),
		).toEqual([
			{
				id: expect.any(String),
				name: 'John1',
				age: 20,
			},
			{
				id: expect.any(String),
				name: 'John2',
				age: 20,
			},
		])
	})

	it("should return null if the object doesn't exist", async () => {
		expect(
			await mongoAdapter.getObject({
				className: '_User',
				id: '5f9b3b3b3b3b3b3b3b3b3b3b',
				fields: ['name'],
			}),
		).toEqual(null)
	})

	it('should create object and return the created object', async () => {
		const insertedObject = await mongoAdapter.createObject({
			className: '_User',
			data: {
				name: 'Lucas',
				age: 23,
			},
			fields: ['age', 'id', 'age'],
			context: { user: {} } as any,
		})

		expect(spyFindHooksAndExecute).toHaveBeenCalledTimes(2)
		expect(spyFindHooksAndExecute).toHaveBeenNthCalledWith(1, {
			operationType: hooks.OperationType.BeforeInsert,
			className: '_User',
			fields: [
				{
					name: 'Lucas',
					age: 23,
				},
			],
			user: {},
			context: expect.any(Object),
		})

		expect(spyFindHooksAndExecute).toHaveBeenNthCalledWith(2, {
			operationType: hooks.OperationType.AfterInsert,
			className: '_User',
			fields: [
				{
					name: 'Lucas',
					age: 23,
				},
			],
			user: {},
			context: expect.any(Object),
		})

		expect(insertedObject).toEqual({ age: 23, id: expect.any(String) })

		const insertedObject2 = await mongoAdapter.createObject({
			className: '_User',
			data: {
				name: 'Lucas2',
				age: 24,
			},
			fields: ['name', 'id', 'age'],
			context: { user: {} } as any,
		})

		expect(insertedObject2).toEqual({
			age: 24,
			id: expect.any(String),
			name: 'Lucas2',
		})
	})

	it('should create multiple objects and return an array of the created object', async () => {
		const insertedObjects = await mongoAdapter.createObjects({
			className: '_User',
			data: [
				{
					name: 'Lucas3',
					age: 23,
				},
				{
					name: 'Lucas4',
					age: 24,
				},
			],
			fields: ['name', 'id'],
			context: { user: {} } as any,
		})

		expect(spyFindHooksAndExecute).toHaveBeenCalledTimes(2)
		expect(spyFindHooksAndExecute).toHaveBeenNthCalledWith(1, {
			operationType: hooks.OperationType.BeforeInsert,
			className: '_User',
			fields: [
				{
					name: 'Lucas3',
					age: 23,
				},
				{
					name: 'Lucas4',
					age: 24,
				},
			],
			user: {},
			context: expect.any(Object),
		})

		expect(spyFindHooksAndExecute).toHaveBeenNthCalledWith(2, {
			operationType: hooks.OperationType.AfterInsert,
			className: '_User',
			fields: [
				{
					name: 'Lucas3',
					age: 23,
				},
				{
					name: 'Lucas4',
					age: 24,
				},
			],
			user: {},
			context: expect.any(Object),
		})

		expect(insertedObjects).toEqual([
			{
				id: expect.any(String),
				name: 'Lucas3',
			},
			{
				id: expect.any(String),
				name: 'Lucas4',
			},
		])
	})

	it('should create multiple objects and return an array of the created object with * fields', async () => {
		const insertedObjects = await mongoAdapter.createObjects({
			className: '_User',
			data: [
				{
					name: 'Lucas3',
					age: 23,
				},
				{
					name: 'Lucas4',
					age: 24,
				},
			],
			fields: ['name', 'id', 'age'],
			context: { user: {} } as any,
		})

		expect(insertedObjects).toEqual([
			{
				id: expect.any(String),
				name: 'Lucas3',
				age: 23,
			},
			{
				id: expect.any(String),
				name: 'Lucas4',
				age: 24,
			},
		])
	})

	it('should update object', async () => {
		const insertedObject = await mongoAdapter.createObject({
			className: '_User',
			data: {
				name: 'John',
				age: 20,
			},
			context: { user: {} } as any,
		})

		if (!insertedObject) fail()

		const id = insertedObject.id

		spyFindHooksAndExecute.mockClear()

		const updatedObject = await mongoAdapter.updateObject({
			className: '_User',
			id: id.toString(),
			data: { name: 'Doe' },
			fields: ['name', 'id'],
			context: { user: {} } as any,
		})

		if (!updatedObject) fail()

		expect(spyFindHooksAndExecute).toHaveBeenCalledTimes(2)
		expect(spyFindHooksAndExecute).toHaveBeenNthCalledWith(1, {
			operationType: hooks.OperationType.BeforeUpdate,
			className: '_User',
			fields: [
				{
					name: 'Doe',
				},
			],
			user: {},
			context: expect.any(Object),
		})
		expect(spyFindHooksAndExecute).toHaveBeenNthCalledWith(2, {
			operationType: hooks.OperationType.AfterUpdate,
			className: '_User',
			fields: [
				{
					name: 'Doe',
				},
			],
			user: {},
			context: expect.any(Object),
		})

		expect(updatedObject).toEqual({
			name: 'Doe',
			id: expect.any(String),
		})

		const updatedObject2 = await mongoAdapter.updateObject({
			className: '_User',
			id: id.toString(),
			data: { name: 'Doe' },
			fields: ['name', 'id', 'age'],
			context: { user: {} } as any,
		})

		if (!updatedObject2) fail()

		expect(updatedObject2).toEqual({
			id: expect.any(String),
			name: 'Doe',
			age: 20,
		})
	})

	it('should update multiple objects', async () => {
		const insertedObjects = await mongoAdapter.createObjects({
			className: '_User',
			data: [
				{
					name: 'Lucas',
					age: 20,
				},
				{
					name: 'Lucas1',
					age: 20,
				},
			],
			context: { user: {} } as any,
		})

		if (!insertedObjects) fail()

		spyFindHooksAndExecute.mockClear()

		const updatedObjects = await mongoAdapter.updateObjects({
			className: '_User',
			where: {
				name: { equalTo: 'Lucas' },
			},
			data: { age: 21 },
			fields: ['name', 'id', 'age'],
			context: { user: {} } as any,
		})

		expect(spyFindHooksAndExecute).toHaveBeenCalledTimes(2)
		expect(spyFindHooksAndExecute).toHaveBeenNthCalledWith(1, {
			operationType: hooks.OperationType.BeforeUpdate,
			className: '_User',
			fields: [
				{
					age: 21,
				},
			],
			user: {},
			context: expect.any(Object),
		})
		expect(spyFindHooksAndExecute).toHaveBeenNthCalledWith(2, {
			operationType: hooks.OperationType.AfterUpdate,
			className: '_User',
			fields: [
				{
					age: 21,
				},
			],
			user: {},
			context: expect.any(Object),
		})

		expect(updatedObjects).toEqual([
			{
				id: expect.any(String),
				name: 'Lucas',
				age: 21,
			},
		])

		const updatedObjects2 = await mongoAdapter.updateObjects({
			className: '_User',
			where: {
				age: { greaterThanOrEqualTo: 20 },
			},
			data: { age: 23 },
			fields: ['name', 'id', 'age'],
			context: { user: {} } as any,
		})

		expect(updatedObjects2).toEqual([
			{
				id: expect.any(String),
				name: 'Lucas',
				age: 23,
			},
			{
				id: expect.any(String),
				name: 'Lucas1',
				age: 23,
			},
		])
	})

	it('should update the same field of an objet that which we use in the where field', async () => {
		const insertedObject = await mongoAdapter.createObject({
			className: '_User',
			data: {
				name: 'John',
				age: 20,
			},
			context: { user: {} } as any,
		})

		if (!insertedObject) fail()

		const updatedObjects = await mongoAdapter.updateObjects({
			className: '_User',
			data: { name: 'Doe' },
			where: {
				name: {
					equalTo: 'John',
				},
			},
			fields: ['age', 'id'],
			context: { user: {} } as any,
		})

		expect(updatedObjects).toEqual([
			{
				id: expect.any(String),
				age: 20,
			},
		])
	})

	it('should delete one object', async () => {
		const insertedObject = await mongoAdapter.createObject({
			className: '_User',
			data: {
				name: 'John',
				age: 20,
			},
			context: { user: {} } as any,
		})

		if (!insertedObject) fail()

		const id = insertedObject.id

		spyFindHooksAndExecute.mockClear()

		const deletedObject = await mongoAdapter.deleteObject({
			className: '_User',
			id: id.toString(),
			fields: ['name', 'id', 'age'],
			context: { user: {} } as any,
		})

		if (!deletedObject) fail()

		expect(spyFindHooksAndExecute).toHaveBeenCalledTimes(2)
		expect(spyFindHooksAndExecute).toHaveBeenNthCalledWith(1, {
			operationType: hooks.OperationType.BeforeDelete,
			className: '_User',
			fields: [],
			user: {},
			context: expect.any(Object),
		})
		expect(spyFindHooksAndExecute).toHaveBeenNthCalledWith(2, {
			operationType: hooks.OperationType.AfterDelete,
			className: '_User',
			fields: [],
			user: {},
			context: expect.any(Object),
		})

		expect(deletedObject).toEqual({
			id: expect.any(String),
			name: 'John',
			age: 20,
		})
	})

	it("should not delete an user that doesn't exist", async () => {
		const res = await mongoAdapter.deleteObject({
			className: '_User',
			id: '5f9b3b3b3b3b3b3b3b3b3b3b',
			context: { user: {} } as any,
		})

		expect(res).toEqual(null)
	})

	it('should delete multiple object', async () => {
		await mongoAdapter.createObject({
			className: '_User',
			data: {
				name: 'John',
				age: 18,
			},
			context: { user: {} } as any,
		})

		await mongoAdapter.createObject({
			className: '_User',
			data: {
				name: 'Lucas',
				age: 18,
			},
			context: { user: {} } as any,
		})

		spyFindHooksAndExecute.mockClear()

		const deletedObjects = await mongoAdapter.deleteObjects({
			className: '_User',
			where: { age: { equalTo: 18 } },
			fields: ['name', 'id', 'age'],
			context: { user: {} } as any,
		})

		if (!deletedObjects) fail()

		expect(spyFindHooksAndExecute).toHaveBeenCalledTimes(2)
		expect(spyFindHooksAndExecute).toHaveBeenNthCalledWith(1, {
			operationType: hooks.OperationType.BeforeDelete,
			className: '_User',
			fields: [],
			user: {},
			context: expect.any(Object),
		})
		expect(spyFindHooksAndExecute).toHaveBeenNthCalledWith(2, {
			operationType: hooks.OperationType.AfterDelete,
			className: '_User',
			fields: [],
			user: {},
			context: expect.any(Object),
		})

		expect(deletedObjects).toEqual([
			{
				id: expect.any(String),
				name: 'John',
				age: 18,
			},
			{
				id: expect.any(String),
				name: 'Lucas',
				age: 18,
			},
		])
	})

	it('should build where query for mongo adapter', () => {
		const where = buildMongoWhereQuery({
			name: { equalTo: 'John' },
			age: { greaterThan: 20 },
			OR: [
				{
					// @ts-expect-error
					age: { lessThan: 10 },
				},
				{ name: { equalTo: 'John' } },
				{
					OR: [
						{
							name: { equalTo: 'Tata' },
						},
					],
				},
			],
			AND: [
				{
					// @ts-expect-error
					age: { lessThan: 10 },
				},
				{ name: { equalTo: 'John' } },
				{
					AND: [
						{
							name: { equalTo: 'Tata' },
						},
					],
				},
			],
		})

		expect(where).toEqual({
			name: 'John',
			age: { $gt: 20 },
			$or: [
				{ age: { $lt: 10 } },
				{ name: 'John' },
				{ $or: [{ name: 'Tata' }] },
			],
			$and: [
				{ age: { $lt: 10 } },
				{ name: 'John' },
				{ $and: [{ name: 'Tata' }] },
			],
		})
	})

	it('should build empty where query for mongoAdapter if where is empty', () => {
		const where = buildMongoWhereQuery({})

		expect(where).toEqual({})
	})

	it('should build empty where query for mongoAdapter if operation not exist', () => {
		// @ts-expect-error
		const where = buildMongoWhereQuery({ name: { notExist: 'John' } })

		expect(where).toEqual({})
	})

	it('should build empty where query for mongoAdapter if operation not exist', () => {
		// @ts-expect-error
		const where = buildMongoWhereQuery({ name: { notExist: 'John' } })

		expect(where).toEqual({})
	})
})
