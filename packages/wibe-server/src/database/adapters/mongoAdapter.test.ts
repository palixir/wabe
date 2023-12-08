import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test'
import { fail } from 'assert'
import { closeTests, setupTests } from '../../utils/testHelper'
import { MongoAdapter, buildMongoWhereQuery } from './MongoAdapter'
import { WibeApp } from '../../server'

describe('Mongo adapter', () => {
	let mongoAdapter: MongoAdapter
	let wibe: WibeApp

	beforeAll(async () => {
		const setup = await setupTests()
		wibe = setup.wibe

		mongoAdapter = WibeApp.databaseController.adapter as MongoAdapter
	})

	afterAll(async () => {
		await closeTests(wibe)
	})

	beforeEach(async () => {
		await mongoAdapter.database?.collection('User').deleteMany({})
	})

	it('should build where query for mongo adapter', () => {
		const where = buildMongoWhereQuery<'User'>({
			name: { equalTo: 'John' },
			age: { greaterThan: 20 },
			OR: [
				{
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

	it('should create class', async () => {
		expect((await mongoAdapter.database?.collections())?.length).toBe(0)

		await mongoAdapter.createClass('User')

		const collections = await mongoAdapter.database?.collections()

		if (!collections) fail()

		expect((await mongoAdapter.database?.collections())?.length).toBe(1)
		expect(collections[0].collectionName).toBe('User')
	})

	it('should get the _id of an object', async () => {
		const insertedObject = await mongoAdapter.createObject<any>({
			className: 'Test1',
			data: {
				name: 'John',
				age: 20,
			},
			fields: ['name', 'id'],
		})

		const res = await mongoAdapter.getObject<any>({
			id: insertedObject?.id.toString(),
			className: 'Test1',
			fields: ['id'],
		})

		expect(res.id).toEqual(insertedObject?.id)

		const res2 = await mongoAdapter.getObject<any>({
			id: insertedObject?.id.toString(),
			className: 'Test1',
			fields: ['name'],
		})

		expect(res2.id).toEqual(undefined)
	})

	it("should not create class if it's not connected", async () => {
		const cloneMongoAdapter = Object.assign(
			Object.create(Object.getPrototypeOf(mongoAdapter)),
			mongoAdapter,
		)
		cloneMongoAdapter.database = undefined

		expect(async () => await cloneMongoAdapter.createClass('User')).toThrow(
			Error('Connection to database is not established'),
		)
	})

	it('should get one object with specific field and * fields', async () => {
		const insertedObject = await mongoAdapter.createObject<any>({
			className: 'Test1',
			data: {
				name: 'John',
				age: 20,
			},
			fields: ['name', 'id'],
		})

		if (!insertedObject) fail()

		const id = insertedObject.id

		expect(id).toBeDefined()

		const field = await mongoAdapter.getObject<any>({
			className: 'Test1',
			id: id.toString(),
			fields: ['name'],
		})

		expect(field).toEqual({
			name: 'John',
		})
	})

	it('should get all object with specific field and * fields', async () => {
		const objects = await mongoAdapter.getObjects<any>({
			className: 'Test2',
			fields: ['name'],
		})

		expect(objects.length).toEqual(0)

		await mongoAdapter.createObject<any>({
			className: 'Test2',
			data: {
				name: 'John1',
				age: 20,
			},
			fields: ['name'],
		})

		await mongoAdapter.createObject<any>({
			className: 'Test2',
			data: {
				name: 'John2',
				age: 20,
			},
			fields: ['name'],
		})

		const objects2 = await mongoAdapter.getObjects<any>({
			className: 'Test2',
			fields: ['name'],
		})

		expect(objects2.length).toEqual(2)
		expect(objects2).toEqual([
			{
				name: 'John1',
			},
			{
				name: 'John2',
			},
		])

		const objects3 = await mongoAdapter.getObjects<any>({
			className: 'Test2',
			fields: ['*'],
		})

		expect(objects3.length).toEqual(2)
		expect(objects3).toEqual([
			{
				id: expect.anything(),
				name: 'John1',
				age: 20,
			},
			{
				id: expect.anything(),
				name: 'John2',
				age: 20,
			},
		])
	})

	it('should get all objects with where filter', async () => {
		await mongoAdapter.createObject<any>({
			className: 'Test3',
			data: {
				name: 'John1',
				age: 20,
			},
			fields: ['name'],
		})

		await mongoAdapter.createObject<'User'>({
			className: 'Test3',
			data: {
				name: 'John2',
				age: 20,
			},
			fields: ['name'],
		})

		// OR statement
		expect(
			await mongoAdapter.getObjects<'User'>({
				className: 'Test3',
				fields: ['*'],
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
			}),
		).toEqual([
			{
				id: expect.anything(),
				name: 'John1',
				age: 20,
			},
			{
				id: expect.anything(),
				name: 'John2',
				age: 20,
			},
		])

		expect(
			await mongoAdapter.getObjects<'User'>({
				className: 'Test3',
				fields: ['*'],
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
			}),
		).toEqual([
			{
				id: expect.anything(),
				name: 'John1',
				age: 20,
			},
		])

		// AND statement
		expect(
			await mongoAdapter.getObjects<'User'>({
				className: 'Test3',
				fields: ['*'],
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
			}),
		).toEqual([
			{
				id: expect.anything(),
				name: 'John1',
				age: 20,
			},
		])

		expect(
			await mongoAdapter.getObjects<'User'>({
				className: 'Test3',
				fields: ['*'],
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
			await mongoAdapter.getObjects<'User'>({
				className: 'Test3',
				fields: ['*'],
				where: {
					name: { equalTo: 'John1' },
				},
			}),
		).toEqual([
			{
				id: expect.anything(),
				name: 'John1',
				age: 20,
			},
		])

		expect(
			await mongoAdapter.getObjects<any>({
				className: 'Test3',
				fields: ['*'],
				where: {
					age: { greaterThan: 21 },
				},
			}),
		).toEqual([])

		// Not equal to statement
		expect(
			await mongoAdapter.getObjects<any>({
				className: 'Test3',
				fields: ['*'],
				where: {
					name: { notEqualTo: 'John1' },
				},
			}),
		).toEqual([
			{
				id: expect.anything(),
				name: 'John2',
				age: 20,
			},
		])

		// Less than statement on string (not implemented)
		expect(
			await mongoAdapter.getObjects<any>({
				className: 'Test3',
				fields: ['*'],
				where: {
					name: { lessThan: 'John1' },
				},
			}),
		).toEqual([])

		// Less than to statement on number
		expect(
			await mongoAdapter.getObjects<any>({
				className: 'Test3',
				fields: ['*'],
				where: {
					age: { lessThan: 30 },
				},
			}),
		).toEqual([
			{
				id: expect.anything(),
				name: 'John1',
				age: 20,
			},
			{
				id: expect.anything(),
				name: 'John2',
				age: 20,
			},
		])

		// Equal to statement on number
		expect(
			await mongoAdapter.getObjects<any>({
				className: 'Test3',
				fields: ['*'],
				where: {
					age: { equalTo: 20 },
				},
			}),
		).toEqual([
			{
				id: expect.anything(),
				name: 'John1',
				age: 20,
			},
			{
				id: expect.anything(),
				name: 'John2',
				age: 20,
			},
		])
	})

	it("should return null if the object doesn't exist", async () => {
		expect(
			await mongoAdapter.getObject<'User'>({
				className: 'Collection1',
				id: '5f9b3b3b3b3b3b3b3b3b3b3b',
				fields: ['name'],
			}),
		).toEqual(null)
	})

	it('should create object and return the created object', async () => {
		const insertedObject = await mongoAdapter.createObject<'User'>({
			className: 'User',
			data: {
				name: 'Lucas',
				age: 23,
			},
			fields: ['age'],
		})

		expect(insertedObject).toEqual({ age: 23 })

		const insertedObject2 = await mongoAdapter.createObject<'User'>({
			className: 'User',
			data: {
				name: 'Lucas2',
				age: 24,
			},
			fields: ['*'],
		})

		expect(insertedObject2).toEqual({
			age: 24,
			id: expect.anything(),
			name: 'Lucas2',
		})
	})

	it('should create multiple objects and return an array of the created object', async () => {
		const insertedObjects = await mongoAdapter.createObjects<'User'>({
			className: 'User',
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
			fields: ['name'],
		})

		expect(insertedObjects).toEqual([
			{
				name: 'Lucas3',
			},
			{
				name: 'Lucas4',
			},
		])
	})

	it('should create multiple objects and return an array of the created object with * fields', async () => {
		const insertedObjects = await mongoAdapter.createObjects<'User'>({
			className: 'User',
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
			fields: ['*'],
		})

		expect(insertedObjects).toEqual([
			{
				id: expect.anything(),
				name: 'Lucas3',
				age: 23,
			},
			{
				id: expect.anything(),
				name: 'Lucas4',
				age: 24,
			},
		])
	})

	it('should update object', async () => {
		const insertedObject = await mongoAdapter.createObject<'User'>({
			className: 'User',
			data: {
				name: 'John',
				age: 20,
			},
			fields: ['*'],
		})

		if (!insertedObject) fail()

		const id = insertedObject.id

		const updatedObject = await mongoAdapter.updateObject<'User'>({
			className: 'User',
			id: id.toString(),
			data: { name: 'Doe' },
			fields: ['name'],
		})

		if (!updatedObject) fail()

		expect(updatedObject).toEqual({
			name: 'Doe',
		})

		const updatedObject2 = await mongoAdapter.updateObject<'User'>({
			className: 'User',
			id: id.toString(),
			data: { name: 'Doe' },
			fields: ['*'],
		})

		if (!updatedObject2) fail()

		expect(updatedObject2).toEqual({
			id: expect.anything(),
			name: 'Doe',
			age: 20,
		})
	})

	it('should update the same field of an objet that which we use in the where field', async () => {
		const insertedObject = await mongoAdapter.createObject<'User'>({
			className: 'User',
			data: {
				name: 'John',
				age: 20,
			},
			fields: ['*'],
		})

		if (!insertedObject) fail()

		const updatedObjects = await mongoAdapter.updateObjects<'User'>({
			className: 'User',
			data: { name: 'Doe' },
			where: {
				name: {
					equalTo: 'John',
				},
			},
			fields: ['age'],
		})

		expect(updatedObjects).toEqual([
			{
				age: 20,
			},
		])
	})

	it('should update multiple objects', async () => {
		const insertedObjects = await mongoAdapter.createObjects<'User'>({
			className: 'User',
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
			fields: ['*'],
		})

		if (!insertedObjects) fail()

		const updatedObjects = await mongoAdapter.updateObjects<'User'>({
			className: 'User',
			where: {
				name: { equalTo: 'Lucas' },
			},
			data: { age: 21 },
			fields: ['*'],
		})

		expect(updatedObjects).toEqual([
			{
				id: expect.anything(),
				name: 'Lucas',
				age: 21,
			},
		])

		const updatedObjects2 = await mongoAdapter.updateObjects<'User'>({
			className: 'User',
			where: {
				age: { greaterThanOrEqualTo: 20 },
			},
			data: { age: 23 },
			fields: ['*'],
		})

		expect(updatedObjects2).toEqual([
			{
				id: expect.anything(),
				name: 'Lucas',
				age: 23,
			},
			{
				id: expect.anything(),
				name: 'Lucas1',
				age: 23,
			},
		])
	})

	it('should delete one object', async () => {
		const insertedObject = await mongoAdapter.createObject<'User'>({
			className: 'User',
			data: {
				name: 'John',
				age: 20,
			},
			fields: ['*'],
		})

		if (!insertedObject) fail()

		const id = insertedObject.id

		const deletedObject = await mongoAdapter.deleteObject<'User'>({
			className: 'User',
			id: id.toString(),
			fields: ['*'],
		})

		if (!deletedObject) fail()

		expect(deletedObject).toEqual({
			id: expect.anything(),
			name: 'John',
			age: 20,
		})
	})

	it("should not delete an user that doesn't exist", async () => {
		const res = await mongoAdapter.deleteObject<'User'>({
			className: 'User',
			id: '5f9b3b3b3b3b3b3b3b3b3b3b',
			fields: ['*'],
		})

		expect(res).toEqual(null)
	})

	it('should delete multiple object', async () => {
		await mongoAdapter.createObject<'User'>({
			className: 'User',
			data: {
				name: 'John',
				age: 18,
			},
			fields: ['*'],
		})

		await mongoAdapter.createObject<'User'>({
			className: 'User',
			data: {
				name: 'Lucas',
				age: 18,
			},
			fields: ['*'],
		})

		const deletedObject = await mongoAdapter.deleteObjects<'User'>({
			className: 'User',
			where: { age: { equalTo: 18 } },
			fields: ['*'],
		})

		if (!deletedObject) fail()

		expect(deletedObject).toEqual([
			{
				id: expect.anything(),
				name: 'John',
				age: 18,
			},
			{
				id: expect.anything(),
				name: 'Lucas',
				age: 18,
			},
		])
	})
})
