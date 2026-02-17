import { afterAll, beforeAll, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import { fail } from 'node:assert'
import { ObjectId } from 'mongodb'
import { notEmpty, type Wabe, type WabeContext } from 'wabe'
import { buildMongoWhereQuery, type MongoAdapter } from '.'
import { setupTests, closeTests } from '../utils/testHelper'

describe('Mongo adapter', () => {
	let mongoAdapter: MongoAdapter<any>
	let wabe: Wabe<any>
	let context: WabeContext<any>

	beforeAll(async () => {
		const setup = await setupTests()
		wabe = setup.wabe

		// @ts-expect-error
		mongoAdapter = wabe.controllers.database.adapter

		context = {
			isRoot: true,
			wabe: {
				controllers: { database: wabe.controllers.database },
				config: wabe.config,
			},
		} as WabeContext<any>
	})

	afterAll(async () => {
		await closeTests(wabe)
	})

	beforeEach(async () => {
		const collections = await mongoAdapter.database?.collections()

		if (collections)
			await Promise.all(
				collections
					?.filter((collection) => collection.collectionName !== 'Role')
					.map((collection) => collection.drop()),
			)
	})

	it('should create a row with no values', async () => {
		const res = await mongoAdapter.createObject({
			className: 'Test',
			data: {},
			context,
		})

		expect(res.id).toBeDefined()

		const res2 = await mongoAdapter.createObjects({
			className: 'Test',
			data: [{}],
			context,
		})

		expect(res2[0]?.id).toBeDefined()
	})

	it('should create a row with an array field', async () => {
		const res = await mongoAdapter.createObject({
			className: 'Test',
			data: {
				array: ['a', 'b', 'c'],
			},
			context,
		})

		expect(res.id).toBeDefined()
	})

	it('should create an object with an enum field', async () => {
		const res = await mongoAdapter.createObject({
			className: 'Test',
			data: {
				enum: 'emailPassword',
			},
			context,
		})

		expect(res.id).toBeDefined()
	})

	it('should update updatedAt on an object (update one and many)', async () => {
		const res = await mongoAdapter.createObject({
			className: 'Test',
			data: {
				array: ['a', 'b', 'c'],
			},
			context,
		})

		const res2 = await mongoAdapter.updateObject({
			className: 'Test',
			data: {
				updatedAt: new Date(),
			},
			context,
			id: res.id,
		})

		expect(res2.id).toBeDefined()

		const res3 = await mongoAdapter.updateObjects({
			className: 'Test',
			data: {
				updatedAt: new Date(),
			},
			context,
			where: {
				id: {
					equalTo: res.id,
				},
			},
		})

		expect(res3.length).toEqual(1)
	})

	it('should insert date in iso string', async () => {
		// Because we store date in iso string in database
		const now = new Date()

		const res = await mongoAdapter.createObject({
			className: 'Test',
			data: {
				date: now.toISOString(),
			},
			context,
		})

		const res2 = await mongoAdapter.getObject({
			className: 'Test',
			id: res.id,
			context,
			select: { date: true },
		})

		expect(res2?.date).toEqual(now.toISOString())
	})

	it('should support notEqualTo', async () => {
		await mongoAdapter.createObjects({
			className: 'User',
			data: [
				{
					name: 'Toto',
				},
				{
					name: 'Toto2',
				},
			],
			context,
		})

		const res2 = await mongoAdapter.getObjects({
			className: 'User',
			context,
			where: {
				name: {
					notEqualTo: 'Toto',
				},
			},
		})

		expect(res2.length).toEqual(1)
		expect(res2[0]?.name).toEqual('Toto2')

		const res3 = await mongoAdapter.getObjects({
			className: 'User',
			context,
			where: {
				email: {
					notEqualTo: 'toto@gmail.com',
				},
			},
		})

		expect(res3.length).toEqual(2)
	})

	it('should query contains on array field', async () => {
		const res = await mongoAdapter.createObject({
			className: 'Test',
			data: {
				array: ['a', 'b', 'c'],
			},
			context,
		})

		expect(res.id).toBeDefined()

		const res2 = await mongoAdapter.getObjects({
			className: 'Test',
			context,
			where: {
				array: {
					contains: 'a',
				},
			},
			select: { array: true },
		})

		expect(res2[0]?.array).toEqual(['a', 'b', 'c'])

		const res3 = await mongoAdapter.getObjects({
			className: 'Test',
			context,
			where: {
				array: {
					notContains: 'd',
				},
			},
			select: { array: true },
		})

		expect(res3[0]?.array).toEqual(['a', 'b', 'c'])
	})

	it('should query equalTo on array field', async () => {
		const res = await mongoAdapter.createObject({
			className: 'Test',
			data: {
				array: ['a', 'b', 'c'],
			},
			context,
		})

		expect(res.id).toBeDefined()

		const res2 = await mongoAdapter.getObjects({
			className: 'Test',
			context,
			where: {
				array: {
					equalTo: ['a', 'b', 'c'],
				},
			},
			select: { array: true },
		})

		expect(res2[0]?.array).toEqual(['a', 'b', 'c'])

		const res3 = await mongoAdapter.getObjects({
			className: 'Test',
			context,
			where: {
				array: {
					notEqualTo: ['d'],
				},
			},
			select: { array: true },
		})

		expect(res3[0]?.array).toEqual(['a', 'b', 'c'])
	})

	it('should update with complex where (AND and OR)', async () => {
		const createdObject = await mongoAdapter.createObject({
			className: 'Test',
			data: {
				field1: 'test',
				int: 10,
			},
			context,
		})

		const res = await mongoAdapter.updateObject({
			className: 'Test',
			id: createdObject.id,
			data: {
				field1: 'tata',
			},
			where: {
				OR: [
					// @ts-expect-error
					{
						AND: [
							{
								field1: { equalTo: 'test' },
							},
							{
								int: { equalTo: 11 },
							},
						],
					},
					// @ts-expect-error
					{
						AND: [
							{
								field1: { equalTo: 'test' },
							},
							{
								int: { equalTo: 10 },
							},
						],
					},
				],
			},
			context,
		})

		expect(res.id).toEqual(createdObject.id)
	})

	it('should support where with null value', async () => {
		await mongoAdapter.createObject({
			className: 'Test',
			data: {
				int: null,
			},
			context,
		})

		const res = await mongoAdapter.getObjects({
			className: 'Test',
			// @ts-expect-error
			where: {
				OR: [{ int: { equalTo: 10 } }, { int: { equalTo: null } }],
			},
			context,
		})

		expect(res.length).toEqual(1)

		const res2 = await mongoAdapter.getObjects({
			className: 'Test',
			where: {
				int: { notEqualTo: null },
			},
			context,
		})

		expect(res2.length).toEqual(0)
	})

	it('should be able to interact with element in array in json', async () => {
		await mongoAdapter.createObject({
			className: 'Test',
			data: {
				object: { array: [{ string: 'string' }] },
			},
			context,
		})

		await mongoAdapter.createObject({
			className: 'Test',
			data: {
				object: { array: [{ string: 'string2' }] },
			},
			context,
		})

		const res = await mongoAdapter.getObjects({
			className: 'Test',
			context,
			where: {
				object: {
					// @ts-expect-error
					array: {
						contains: { string: 'string' },
					},
				},
			},
		})

		expect(res.length).toBe(1)

		const res2 = await mongoAdapter.getObjects({
			className: 'Test',
			context,
			where: {
				object: {
					// @ts-expect-error
					array: {
						notContains: { string: 'string' },
					},
				},
			},
		})

		expect(res2.length).toBe(1)
	})

	it('should correctly exclude documents with notContains on array of objects (ACL notContains fix)', async () => {
		await mongoAdapter.createObject({
			className: 'Test',
			data: {
				object: { array: [{ string: 'user1' }] },
			},
			context,
		})

		await mongoAdapter.createObject({
			className: 'Test',
			data: {
				object: { array: [{ string: 'user2' }] },
			},
			context,
		})

		const res = await mongoAdapter.getObjects({
			className: 'Test',
			context,
			where: {
				object: {
					// @ts-expect-error
					array: {
						notContains: { string: 'user1' },
					},
				},
			},
		})

		expect(res.length).toBe(1)
		expect(res[0]?.object?.array).toEqual([{ string: 'user2' }])
	})

	it('should correctly filter with nested notContains and equalTo without recursion overwrite', async () => {
		await mongoAdapter.createObject({
			className: 'Test',
			data: {
				object: { array: [{ string: 'user1' }] },
			},
			context,
		})

		await mongoAdapter.createObject({
			className: 'Test',
			data: {
				object: { array: [{ string: 'user2' }] },
			},
			context,
		})

		const res = await mongoAdapter.getObjects({
			className: 'Test',
			context,
			where: {
				object: {
					// @ts-expect-error
					array: {
						notContains: { string: { equalTo: 'user1' } },
					},
				},
			},
		})

		expect(res.length).toBe(1)
		expect(res[0]?.object?.array).toEqual([{ string: 'user2' }])
	})

	it('should retry on connection error', async () => {
		const spyMongoClientConnect = spyOn(mongoAdapter.client, 'connect').mockImplementationOnce(
			() => {
				throw new Error('Connection error')
			},
		)

		await mongoAdapter.initializeDatabase(wabe.config.schema || {})

		expect(spyMongoClientConnect).toHaveBeenCalledTimes(2)

		spyMongoClientConnect.mockRestore()
		spyMongoClientConnect.mockClear()
	})

	it('should only return id on createObject if fields is empty', async () => {
		const res = await mongoAdapter.createObject({
			className: 'User',
			data: {
				name: 'John',
				age: 20,
			},
			context,
			select: {},
		})

		expect(ObjectId.isValid(res?.id || '')).toBeTrue()
		expect(res).toEqual({ id: expect.any(String) })
	})

	it('should only return an array of id on createObjects if fields is empty', async () => {
		const res = await mongoAdapter.createObjects({
			className: 'User',
			data: [
				{
					name: 'John',
					age: 20,
				},
			],
			context,
			select: {},
		})

		expect(ObjectId.isValid(res[0]?.id || '')).toBeTrue()
		expect(res).toEqual([{ id: expect.any(String) }])
	})

	it('should only return id on updateObject if fields is empty', async () => {
		const insertedObject = await mongoAdapter.createObject({
			className: 'User',
			data: {
				name: 'John',
				age: 20,
			},
			context,
		})

		const res = await mongoAdapter.updateObject({
			className: 'User',
			id: insertedObject?.id || '',
			data: { name: 'Doe' },
			select: {},
			context,
		})

		expect(ObjectId.isValid(res?.id || '')).toBeTrue()
		expect(res).toEqual({ id: expect.any(String) })
	})

	it('should only return an array of id on updateObjects if fields is empty', async () => {
		await mongoAdapter.createObjects({
			className: 'User',
			data: [
				{
					name: 'John',
					age: 20,
				},
			],
			context,
		})

		const res = await mongoAdapter.updateObjects({
			className: 'User',
			where: {
				name: { equalTo: 'John' },
			},
			data: { name: 'Doe' },
			select: {},
			context,
		})

		expect(ObjectId.isValid(res[0]?.id || '')).toBeTrue()
		expect(res).toEqual([{ id: expect.any(String) }])
	})

	it("should order the result by the field 'name' in ascending order", async () => {
		await mongoAdapter.createObjects({
			className: 'User',
			data: [
				{
					name: 'A',
					age: 20,
				},
				{
					name: 'B',
					age: 18,
				},
			],
			select: {},
			context,
		})

		const res = await mongoAdapter.getObjects({
			className: 'User',
			select: { name: true },
			order: {
				name: 'ASC',
			},
			context,
		})

		expect(res.map((user) => user?.name)).toEqual(['A', 'B'])
	})

	it("should order the result by the field 'name' in descending order", async () => {
		await mongoAdapter.createObjects({
			className: 'User',
			data: [
				{
					name: 'A',
					age: 20,
				},
				{
					name: 'B',
					age: 18,
				},
			],
			select: {},
			context,
		})

		const res = await mongoAdapter.getObjects({
			className: 'User',
			select: { name: true },
			order: {
				name: 'DESC',
			},
			context,
		})

		expect(res.map((user) => user?.name)).toEqual(['B', 'A'])
	})

	it("should order the result by the field 'age' and 'name' in descending order", async () => {
		await mongoAdapter.createObjects({
			className: 'User',
			data: [
				{
					name: 'A',
					age: 20,
				},
				{
					name: 'B',
					age: 18,
				},
			],
			select: {},
			context,
		})

		const res = await mongoAdapter.getObjects({
			className: 'User',
			select: { name: true },
			order: {
				age: 'ASC',
				name: 'DESC',
			},
			context,
		})

		expect(res.map((user) => user?.name)).toEqual(['B', 'A'])
	})

	it('should count all elements corresponds to where condition in collection', async () => {
		const res = await mongoAdapter.count({
			className: 'User',
			context,
		})

		expect(res).toEqual(0)

		await mongoAdapter.createObjects({
			className: 'User',
			data: [
				{
					name: 'Lucas',
					age: 20,
				},
				{
					name: 'LucasBis',
					age: 18,
				},
			],
			select: {},
			context,
		})

		const res2 = await mongoAdapter.count({
			className: 'User',
			context,
		})

		expect(res2).toEqual(2)

		const res3 = await mongoAdapter.count({
			className: 'User',
			context,
			where: { age: { equalTo: 20 } },
		})

		expect(res3).toEqual(1)
	})

	it('should clear all database except Role collection', async () => {
		await mongoAdapter.createObjects({
			className: 'User',
			data: [
				{
					name: 'Lucas',
					age: 20,
				},
				{
					name: 'LucasBis',
					age: 18,
				},
			],
			select: {},
			context,
		})

		await mongoAdapter.createObjects({
			className: '_Session',
			data: [
				{
					refreshToken: 'refreshToken',
				},
				{
					refreshToken: 'refreshToken',
				},
			],
			select: {},
			context,
		})

		await mongoAdapter.clearDatabase()

		const res = await mongoAdapter.getObjects({
			className: 'User',
			select: {},
			context,
		})

		const res2 = await mongoAdapter.getObjects({
			className: '_Session',
			select: {},
			context,
		})

		const res3 = await mongoAdapter.getObjects({
			className: 'Role',
			select: { id: true },
			context,
		})

		expect(res.length).toEqual(0)
		expect(res2.length).toEqual(0)
		expect(res3.length).not.toEqual(0)
	})

	it('should support where on getObject for additional check (acl for example)', async () => {
		const insertedObjects = await mongoAdapter.createObjects({
			className: 'User',
			data: [
				{
					name: 'Lucas',
					age: 20,
				},
				{
					name: 'LucasBis',
					age: 18,
				},
			],
			select: { id: true },
			context,
		})

		expect(
			mongoAdapter.getObject({
				className: 'User',
				where: {
					name: { equalTo: 'InvalidName' },
				},
				id: insertedObjects[0]?.id || '',
				context,
			}),
		).rejects.toThrow('Object not found')

		const res = await mongoAdapter.getObject({
			className: 'User',
			where: {
				name: { equalTo: 'Lucas' },
			},
			id: insertedObjects[0]?.id || '',
			context,
		})

		expect(res?.name).toEqual('Lucas')
	})

	it('should support where on updateObject for additional check (acl for example)', async () => {
		const insertedObjects = await mongoAdapter.createObjects({
			className: 'User',
			data: [
				{
					name: 'Lucas',
					age: 20,
				},
				{
					name: 'LucasBis',
					age: 18,
				},
			],
			select: { id: true },
			context,
		})

		expect(
			mongoAdapter.updateObject({
				className: 'User',
				where: {
					name: { equalTo: 'InvalidName' },
				},
				id: insertedObjects[0]?.id || '',
				context,
				data: { name: 'Lucas2' },
			}),
		).rejects.toThrow('Object not found')

		const { id } = await mongoAdapter.updateObject({
			className: 'User',
			where: {
				name: { equalTo: 'Lucas' },
			},
			id: insertedObjects[0]?.id || '',
			context,
			data: { name: 'Lucas2' },
		})

		const updatedObject = await mongoAdapter.getObject({
			className: 'User',
			id,
			select: { id: true, name: true },
			context,
		})

		expect(updatedObject?.name).toEqual('Lucas2')
	})

	it('should support where on delete for additional check (acl for example)', async () => {
		const insertedObjects = await mongoAdapter.createObjects({
			className: 'User',
			data: [
				{
					name: 'Lucas',
					age: 20,
				},
				{
					name: 'LucasBis',
					age: 18,
				},
			],
			select: { id: true },
			context,
		})

		expect(
			mongoAdapter.deleteObject({
				className: 'User',
				where: {
					name: { equalTo: 'InvalidName' },
				},
				id: insertedObjects[0]?.id || '',
				context,
			}),
		).rejects.toThrow('Object not found')

		await mongoAdapter.deleteObject({
			className: 'User',
			where: {
				name: { equalTo: 'Lucas' },
			},
			id: insertedObjects[0]?.id || '',
			context,
		})
	})

	it('should support notEqualTo on _id', async () => {
		const insertedObjects = await mongoAdapter.createObjects({
			className: 'User',
			data: [
				{
					name: 'Lucas',
					age: 20,
				},
				{
					name: 'LucasBis',
					age: 18,
				},
			],
			select: { id: true },
			context,
		})

		const res = await mongoAdapter.getObjects({
			className: 'User',
			where: {
				id: { notEqualTo: insertedObjects[0]?.id },
			},
			context,
		})

		expect(res.length).toEqual(1)
	})

	it('should support equalTo on _id', async () => {
		const insertedObjects = await mongoAdapter.createObjects({
			className: 'User',
			data: [
				{
					name: 'Lucas',
					age: 20,
				},
				{
					name: 'LucasBis',
					age: 18,
				},
			],
			select: { id: true },
			context,
		})

		const res = await mongoAdapter.getObjects({
			className: 'User',
			where: {
				id: { equalTo: insertedObjects[0]?.id },
			},
			context,
		})

		expect(res.length).toEqual(1)
	})

	it('should support $in aggregation on _id', async () => {
		const insertedObjects = await mongoAdapter.createObjects({
			className: 'User',
			data: [
				{
					name: 'Lucas',
					age: 20,
				},
				{
					name: 'LucasBis',
					age: 18,
				},
			],
			select: { id: true },
			context,
		})

		const res = await mongoAdapter.getObjects({
			className: 'User',
			where: {
				id: { in: insertedObjects.map((obj) => obj?.id).filter(notEmpty) },
			},
			context,
		})

		expect(res.length).toEqual(2)
	})

	it('should support $nin aggregation on _id', async () => {
		const insertedObjects = await mongoAdapter.createObjects({
			className: 'User',
			data: [
				{
					name: 'Lucas',
					age: 20,
				},
				{
					name: 'LucasBis',
					age: 18,
				},
			],
			select: { id: true },
			context,
		})

		const res = await mongoAdapter.getObjects({
			className: 'User',
			where: {
				id: { notIn: insertedObjects.map((obj) => obj?.id).filter(notEmpty) },
			},
			context,
		})

		expect(res.length).toEqual(0)
	})

	it('should create class', () => {
		if (!mongoAdapter.database) fail()

		const spyCollection = spyOn(mongoAdapter.database, 'collection').mockReturnValue({} as any)

		mongoAdapter.createClassIfNotExist('User', context.wabe.config.schema || {})

		expect(spyCollection).toHaveBeenCalledTimes(1)
		expect(spyCollection).toHaveBeenCalledWith('User')

		spyCollection.mockRestore()
	})

	it("should not create class if it's not connected", () => {
		const cloneMongoAdapter = Object.assign(
			Object.create(Object.getPrototypeOf(mongoAdapter)),
			mongoAdapter,
		)
		cloneMongoAdapter.database = undefined

		expect(() => cloneMongoAdapter.createClassIfNotExist('User')).toThrow(
			'Connection to database is not established',
		)
	})

	it('should always return id', async () => {
		const insertedObjects = await mongoAdapter.createObjects({
			className: 'User',
			data: [
				{
					name: 'Lucas',
					age: 20,
				},
			],
			context,
			select: { age: true, id: true },
		})

		if (!insertedObjects) fail()

		expect(insertedObjects[0]?.id).toBeDefined()
	})

	it('should return id if no fields is specified', async () => {
		const insertedObjects = await mongoAdapter.createObjects({
			className: 'User',
			data: [
				{
					name: 'Lucas',
					age: 20,
				},
			],
			context,
		})

		if (!insertedObjects) fail()

		expect(insertedObjects[0]?.id).toBeDefined()
	})

	it('should getObjects using id and not _id', async () => {
		const insertedObjects = await mongoAdapter.createObjects({
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
			select: { name: true, id: true },
			context,
		})

		if (!insertedObjects) fail()

		const res = await mongoAdapter.getObjects({
			className: 'User',
			where: {
				id: {
					equalTo: ObjectId.createFromHexString(insertedObjects[0]?.id || '').toString(),
				},
			},
			context,
		})

		expect(res.length).toEqual(1)
	})

	it('should getObjects with limit and offset', async () => {
		await mongoAdapter.createObjects({
			className: 'User',
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
			select: { name: true, id: true },
			context,
		})

		const res = await mongoAdapter.getObjects({
			className: 'User',
			select: { name: true },
			first: 2,
			offset: 2,
			context,
		})

		expect(res.length).toEqual(2)
		expect(res[0]?.name).toEqual('John2')
		expect(res[1]?.name).toEqual('John3')
	})

	it('should get all the objects without limit and without offset', async () => {
		await mongoAdapter.createObjects({
			className: 'User',
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
			select: { name: true, id: true },
			context,
		})

		const res = await mongoAdapter.getObjects({
			className: 'User',
			select: { name: true },
			context,
			where: {},
		})

		expect(res.length).toEqual(5)
	})

	it('should get the _id of an object', async () => {
		const insertedObject = await mongoAdapter.createObject({
			className: 'User',
			data: {
				name: 'John',
				age: 20,
			},
			select: { name: true, id: true },
			context,
		})

		const res = await mongoAdapter.getObject({
			id: insertedObject?.id.toString() || '',
			className: 'User',
			select: { id: true },
			context,
		})

		expect(res?.id).toEqual(insertedObject?.id || '')
	})

	it('should get all fields when * is specified', async () => {
		const insertedObject = await mongoAdapter.createObject({
			className: 'User',
			data: {
				name: 'John',
				age: 20,
			},
			select: { name: true, id: true },
			context,
		})

		if (!insertedObject) fail()

		const id = insertedObject.id

		expect(id).toBeDefined()

		const res = await mongoAdapter.getObject({
			className: 'User',
			id: id.toString(),

			context,
		})

		expect(res).toEqual(
			expect.objectContaining({
				name: 'John',
				age: 20,
				id: expect.any(String),
			}),
		)
	})

	it('should get one object with specific field and * fields', async () => {
		const insertedObject = await mongoAdapter.createObject({
			className: 'User',
			data: {
				name: 'John',
				age: 20,
			},
			select: { name: true, id: true },
			context,
		})

		if (!insertedObject) fail()

		const id = insertedObject.id

		expect(id).toBeDefined()

		const field = await mongoAdapter.getObject({
			className: 'User',
			id: id.toString(),
			select: { name: true, id: true },
			context,
		})

		expect(field).toEqual({
			name: 'John',
			id: expect.any(String),
		})
	})

	it('should get all object with specific field and * fields', async () => {
		const objects = await mongoAdapter.getObjects({
			className: 'User',
			select: { name: true },
			context,
		})

		expect(objects.length).toEqual(0)

		await mongoAdapter.createObject({
			className: 'User',
			data: {
				name: 'John1',
				age: 20,
			},
			select: { name: true },
			context,
		})

		await mongoAdapter.createObject({
			className: 'User',
			data: {
				name: 'John2',
				age: 20,
			},
			select: { name: true },
			context,
		})

		const objects2 = await mongoAdapter.getObjects({
			className: 'User',
			select: { name: true, id: true },
			context,
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
			className: 'User',
			select: { name: true, id: true, age: true },
			context,
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
			className: 'User',
			data: {
				name: 'John1',
				age: 20,
			},
			select: { name: true },
			context,
		})

		await mongoAdapter.createObject({
			className: 'User',
			data: {
				name: 'John2',
				age: 20,
			},
			select: { name: true },
			context,
		})

		// OR statement
		expect(
			await mongoAdapter.getObjects({
				className: 'User',
				// @ts-expect-error
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
				select: { name: true, id: true, age: true },
				context,
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
				className: 'User',
				// @ts-expect-error
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
				select: { name: true, id: true, age: true },
				context,
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
				className: 'User',
				// @ts-expect-error
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
				select: { name: true, id: true, age: true },
				context,
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
				className: 'User',
				// @ts-expect-error
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
				context,
			}),
		).toEqual([])

		// Equal to statement
		expect(
			await mongoAdapter.getObjects({
				className: 'User',
				where: {
					name: { equalTo: 'John1' },
				},
				select: { name: true, id: true, age: true },
				context,
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
				className: 'User',
				where: {
					age: { greaterThan: 21 },
				},
				context,
			}),
		).toEqual([])

		// Not equal to statement
		expect(
			await mongoAdapter.getObjects({
				className: 'User',
				where: {
					name: { notEqualTo: 'John1' },
				},
				select: { name: true, id: true, age: true },
				context,
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
				className: 'User',
				where: {
					name: { lessThan: 'John1' },
				},
				context,
			}),
		).toEqual([])

		// Less than to statement on number
		expect(
			await mongoAdapter.getObjects({
				className: 'User',
				where: {
					age: { lessThan: 30 },
				},
				select: { name: true, id: true, age: true },
				context,
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
				className: 'User',
				where: {
					age: { equalTo: 20 },
				},
				select: { name: true, id: true, age: true },
				context,
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

	it("should throw object not found if the object doesn't exist", () => {
		expect(
			mongoAdapter.getObject({
				className: 'User',
				id: '5f9b3b3b3b3b3b3b3b3b3b3b',
				select: { name: true },
				context,
			}),
		).rejects.toThrow('Object not found')
	})

	it('should create object and return the created object', async () => {
		const { id } = await mongoAdapter.createObject({
			className: 'User',
			data: {
				name: 'Lucas',
				age: 23,
			},
			select: { age: true, id: true },
			context,
		})

		const insertedObject = await mongoAdapter.getObject({
			className: 'User',
			id,
			select: { age: true, id: true },
			context,
		})

		expect(insertedObject).toEqual({ age: 23, id: expect.any(String) })

		const { id: id2 } = await mongoAdapter.createObject({
			className: 'User',
			data: {
				name: 'Lucas2',
				age: 24,
			},
			select: { name: true, id: true, age: true },
			context,
		})

		const insertedObject2 = await mongoAdapter.getObject({
			className: 'User',
			id: id2,
			select: { name: true, id: true, age: true },
			context,
		})

		expect(insertedObject2).toEqual({
			age: 24,
			id: expect.any(String),
			name: 'Lucas2',
		})
	})

	it('should create multiple objects and return an array of the created object', async () => {
		await mongoAdapter.createObjects({
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
			select: { name: true, id: true },
			context,
		})

		const insertedObjects = await mongoAdapter.getObjects({
			className: 'User',
			where: {},
			select: { name: true, id: true },
			context,
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
		await mongoAdapter.createObjects({
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
			select: { name: true, id: true, age: true },
			context,
		})

		const insertedObjects = await mongoAdapter.getObjects({
			className: 'User',
			where: {},
			select: { name: true, id: true, age: true },
			context,
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
			className: 'User',
			data: {
				name: 'John',
				age: 20,
			},
			context,
		})

		if (!insertedObject) fail()

		const id = insertedObject.id

		await mongoAdapter.updateObject({
			className: 'User',
			id: id.toString(),
			data: { name: 'Doe' },
			select: { name: true, id: true },
			context,
		})

		const updatedObject = await mongoAdapter.getObject({
			className: 'User',
			id: id.toString(),
			select: { name: true, id: true },
			context,
		})

		expect(updatedObject).toEqual({
			name: 'Doe',
			id: expect.any(String),
		})

		await mongoAdapter.updateObject({
			className: 'User',
			id: id.toString(),
			data: { name: 'Doe' },
			select: { name: true, id: true, age: true },
			context,
		})

		const updatedObject2 = await mongoAdapter.getObject({
			className: 'User',
			id: id.toString(),
			select: { name: true, age: true, id: true },
			context,
		})

		expect(updatedObject2).toEqual({
			id: expect.any(String),
			name: 'Doe',
			age: 20,
		})
	})

	it('should update multiple objects', async () => {
		const insertedObjects = await mongoAdapter.createObjects({
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
			context,
		})

		if (!insertedObjects) fail()

		await mongoAdapter.updateObjects({
			className: 'User',
			where: {
				name: { equalTo: 'Lucas' },
			},
			data: { name: 'Doe' },
			select: { name: true, id: true },
			context,
		})

		const updatedObjects = await mongoAdapter.getObjects({
			className: 'User',
			where: {
				name: {
					equalTo: 'Doe',
				},
			},
			select: { name: true, id: true },
			context,
		})

		expect(updatedObjects).toEqual([
			{
				id: expect.any(String),
				name: 'Doe',
			},
		])

		await mongoAdapter.updateObjects({
			className: 'User',
			where: {
				age: { greaterThanOrEqualTo: 20 },
			},
			data: { age: 23 },
			select: { name: true, id: true, age: true },
			context,
		})

		const updatedObjects2 = await mongoAdapter.getObjects({
			className: 'User',
			where: {
				age: {
					greaterThanOrEqualTo: 23,
				},
			},
			select: { age: true, name: true, id: true },
			context,
		})

		expect(updatedObjects2).toEqual(
			expect.arrayContaining([
				{
					id: expect.any(String),
					name: 'Doe',
					age: 23,
				},
				{
					id: expect.any(String),
					name: 'Lucas1',
					age: 23,
				},
			]),
		)
	})

	it('should update the same field of an object that which we use in the where field', async () => {
		const insertedObject = await mongoAdapter.createObject({
			className: 'User',
			data: {
				name: 'John',
				age: 20,
			},
			context,
		})

		if (!insertedObject) fail()

		await mongoAdapter.updateObjects({
			className: 'User',
			data: { name: 'Doe' },
			where: {
				name: {
					equalTo: 'John',
				},
			},
			select: {},
			context,
		})

		const updatedObjects = await mongoAdapter.getObjects({
			className: 'User',
			where: {
				name: {
					equalTo: 'Doe',
				},
			},
			select: { age: true, id: true },
			context,
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
			className: 'User',
			data: {
				name: 'John',
				age: 20,
			},
			context,
		})

		if (!insertedObject) fail()

		const id = insertedObject.id

		await mongoAdapter.deleteObject({
			className: 'User',
			id: id.toString(),
			select: { name: true, id: true, age: true },
			context,
		})

		expect(
			mongoAdapter.getObject({
				className: 'User',
				id: id.toString(),
				context,
			}),
		).rejects.toThrow('Object not found')
	})

	it('should delete multiple object', async () => {
		await mongoAdapter.createObject({
			className: 'User',
			data: {
				name: 'John',
				age: 18,
			},
			context,
		})

		await mongoAdapter.createObject({
			className: 'User',
			data: {
				name: 'Lucas',
				age: 18,
			},
			context,
		})

		await mongoAdapter.deleteObjects({
			className: 'User',
			where: { age: { equalTo: 18 } },
			select: { name: true, id: true, age: true },
			context,
		})

		const resAfterDelete = await mongoAdapter.getObjects({
			className: 'User',
			where: { age: { equalTo: 18 } },
			context,
		})

		expect(resAfterDelete.length).toEqual(0)
	})

	it('should build where query with equalTo null', () => {
		const where = buildMongoWhereQuery({
			acl: { equalTo: null },
		})

		expect(where).toEqual({
			acl: null,
		})
	})

	it('should build where query for mongo adapter', () => {
		const where = buildMongoWhereQuery({
			name: { equalTo: 'John' },
			age: { greaterThan: 20 },
			OR: [
				{
					age: { lessThan: 10 },
				},
				{
					name: { equalTo: 'John' },
				},
				// @ts-expect-error
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
				{
					name: { equalTo: 'John' },
				},
				// @ts-expect-error
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
			$or: [{ age: { $lt: 10 } }, { name: 'John' }, { $or: [{ name: 'Tata' }] }],
			$and: [{ age: { $lt: 10 } }, { name: 'John' }, { $and: [{ name: 'Tata' }] }],
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

	it('should build nested notContains with equalTo for MongoDB $elemMatch', () => {
		const where = buildMongoWhereQuery({
			data: {
				// @ts-expect-error
				array: {
					notContains: { string: { equalTo: 'user1' } },
				},
			},
		})

		expect(where).toEqual({
			'data.array': {
				$not: { $elemMatch: { string: 'user1' } },
			},
		})
	})

	it('should request sub object in object', async () => {
		await mongoAdapter.createObject({
			className: 'User',
			context,
			data: {
				authentication: {
					emailPassword: {
						email: 'email@test.fr',
						password: 'password',
					},
				},
			},
		})

		const res = await mongoAdapter.getObjects({
			className: 'User',
			where: {
				authentication: {
					// @ts-expect-error
					emailPassword: {
						email: { equalTo: 'email@test.fr' },
					},
				},
			},
			context,
			select: { authentication: true },
		})

		expect(res.length).toEqual(1)
		expect(res[0]?.authentication?.emailPassword?.email).toEqual('email@test.fr')
		expect(res[0]?.authentication?.emailPassword?.password).toEqual('password')
	})

	it('should request sub object in object with selection fields', async () => {
		await mongoAdapter.createObject({
			className: 'User',
			context,
			data: {
				authentication: {
					emailPassword: {
						email: 'email@test.fr',
						password: 'password',
					},
				},
			},
		})

		const res = await mongoAdapter.getObjects({
			className: 'User',
			where: {
				authentication: {
					// @ts-expect-error
					emailPassword: {
						email: { equalTo: 'email@test.fr' },
					},
				},
			},
			context,
			// @ts-expect-error
			select: { authentication: { emailPassword: { email: true } } },
		})

		expect(res.length).toEqual(1)
		expect(res[0]?.authentication?.emailPassword?.email).toEqual('email@test.fr')
		expect(res[0]?.authentication?.emailPassword?.password).toBeUndefined()
	})

	it('should filter documents where field exists (exists: true)', async () => {
		// Create test documents using the adapter
		await mongoAdapter.createObjects({
			className: 'Test',
			data: [
				{ name: 'Document with name', age: 25 },
				{ name: 'Another document with name', age: 30 },
				// @ts-expect-error
				{ age: 35 }, // No name field
			],
			context,
		})

		// Test exists: true using the adapter
		const results = await mongoAdapter.getObjects({
			className: 'Test',
			where: { name: { exists: true } },
			context,
		})

		expect(results.length).toBe(2)
		expect(results.every((doc) => doc?.name !== undefined)).toBe(true)
	})

	it('should filter documents where field does not exist (exists: false)', async () => {
		// Create test documents using the adapter
		await mongoAdapter.createObjects({
			className: 'Test',
			data: [
				{ name: 'Document with name', age: 25 },
				// @ts-expect-error
				{ age: 30 }, // No name field
				// @ts-expect-error
				{ age: 35 }, // No name field
			],
			context,
		})

		// Test exists: false using the adapter
		const results = await mongoAdapter.getObjects({
			className: 'Test',
			where: { name: { exists: false } },
			context,
		})

		expect(results.length).toBe(2)
		expect(results.every((doc) => doc?.name === undefined || doc?.name === null)).toBe(true)
	})

	it('should handle exists with null values correctly', async () => {
		await mongoAdapter.createObjects({
			className: 'Test',
			data: [
				{ name: 'Document with name', age: 25 },
				{ name: null, age: 30 },
				// @ts-expect-error
				{ age: 35 },
			],
			context,
		})

		// Test exists: true
		const resultsTrue = await mongoAdapter.getObjects({
			className: 'Test',
			where: { name: { exists: true } },
			context,
		})

		expect(resultsTrue.length).toBe(1)

		// Test exists: false - should use $eq: null, which matches both null values and missing fields
		const resultsFalse = await mongoAdapter.getObjects({
			className: 'Test',
			where: { name: { exists: false } },
			context,
		})

		// Note: In MongoDB, $eq: null matches both documents where field is null AND where field doesn't exist
		expect(resultsFalse.length).toBe(2)
		expect(resultsFalse.some((doc) => doc?.age === 30)).toBe(true)
		expect(resultsFalse.some((doc) => doc?.age === 35)).toBe(true)
	})

	it('should handle exists with JSON fields and null array in object', async () => {
		// Create test documents with JSON data using the adapter
		await mongoAdapter.createObjects({
			className: 'Test',
			data: [
				{ object: { array: [{ string: 'John' }] }, int: 25 },
				{ object: { array: null }, int: 30 },
				{ object: null, int: 35 },
			],
			context,
		})

		const results = await mongoAdapter.getObjects({
			className: 'Test',
			// @ts-expect-error
			where: { object: { array: { exists: true } } },
			context,
		})

		expect(results.length).toBe(1)
		expect(results.some((row) => row?.int === 25)).toBe(true)
	})

	it('should handle correctly equalTo and notEqualTo undefined', async () => {
		// Create test documents with JSON data using the adapter
		await mongoAdapter.createObjects({
			className: 'Test',
			// @ts-expect-error
			data: [{ object: null, field1: 'John', float: 2.5 }, { int: 35 }],
			context,
		})

		const results = await mongoAdapter.getObjects({
			className: 'Test',
			where: { int: { equalTo: undefined } },
			context,
		})

		expect(results.length).toBe(1)
		expect(results.some((row) => row?.field1 === 'John')).toBe(true)

		const results2 = await mongoAdapter.getObjects({
			className: 'Test',
			where: { int: { notEqualTo: undefined } },
			context,
		})

		expect(results2.length).toBe(1)
		expect(results2.some((row) => row?.int === 35)).toBe(true)

		const results3 = await mongoAdapter.getObjects({
			className: 'Test',
			where: { int: { equalTo: undefined }, float: { greaterThan: 2 } },
			context,
		})

		expect(results3.length).toBe(1)
		expect(results3.some((row) => row?.field1 === 'John')).toBe(true)
	})
})
