import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	spyOn,
} from 'bun:test'
import { fail } from 'node:assert'
import { notEmpty, type Wabe, type WabeContext } from 'wabe'
import { buildPostgresWhereQueryAndValues, PostgresAdapter } from '.'
import { setupTests, closeTests } from '../utils/testHelper'

describe('Postgres adapter', () => {
	let postgresAdapter: PostgresAdapter<any>
	let wabe: Wabe<any>
	let context: WabeContext<any>

	beforeAll(async () => {
		const setup = await setupTests()
		wabe = setup.wabe

		// @ts-expect-error
		postgresAdapter = wabe.controllers.database.adapter

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
		// Get all tables except Role
		// 	const client = await postgresAdapter.pool.connect()
		// 	try {
		// 		const tablesResult = await client.query(`
		//     SELECT tablename
		//     FROM pg_catalog.pg_tables
		//     WHERE schemaname = 'public' AND tablename != 'Role'
		//   `)
		// 		// Delete all data from each table
		// 		for (const table of tablesResult.rows) {
		// 			await client.query(
		// 				`TRUNCATE TABLE "${table.tablename}" CASCADE`
		// 			)
		// 		}
		// 	} finally {
		// 		client.release()
		// 	}
	})

	it.only('should create class', async () => {
		// const client = await postgresAdapter.pool.connect()
		// const spyQuery = spyOn(client, 'query').mockResolvedValue({ rows: [] })
		// client.release()
		// const spyConnect = spyOn(
		// 	postgresAdapter.pool,
		// 	'connect'
		// ).mockResolvedValue(client)
		// await postgresAdapter.createClassIfNotExist('User', context)
		// expect(spyQuery).toHaveBeenCalled()
		// expect(spyConnect).toHaveBeenCalledTimes(1)
		// spyQuery.mockRestore()
		// spyConnect.mockRestore()
	})

	it('should retry on connection error', async () => {
		const spyPoolConnect = spyOn(
			postgresAdapter.pool,
			'connect'
		).mockImplementationOnce(() => {
			throw new Error('Connection error')
		})

		await postgresAdapter.connect()

		expect(spyPoolConnect).toHaveBeenCalledTimes(2)

		spyPoolConnect.mockRestore()
		spyPoolConnect.mockClear()
	})

	it('should only return id on createObject if fields is empty', async () => {
		const res = await postgresAdapter.createObject({
			className: 'User',
			data: {
				name: 'John',
				age: 20,
			},
			context,
			select: {},
		})

		expect(res?.id).toBeDefined()
		expect(res).toEqual({ id: expect.any(String) })
	})

	it('should only return an array of id on createObjects if fields is empty', async () => {
		const res = await postgresAdapter.createObjects({
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

		expect(res[0]?.id).toBeDefined()
		expect(res).toEqual([{ id: expect.any(String) }])
	})

	it('should only return id on updateObject if fields is empty', async () => {
		const insertedObject = await postgresAdapter.createObject({
			className: 'User',
			data: {
				name: 'John',
				age: 20,
			},
			context,
		})

		const res = await postgresAdapter.updateObject({
			className: 'User',
			id: insertedObject?.id || '',
			data: { name: 'Doe' },
			select: {},
			context,
		})

		expect(res?.id).toBeDefined()
		expect(res).toEqual({ id: expect.any(String) })
	})

	it('should only return an array of id on updateObjects if fields is empty', async () => {
		await postgresAdapter.createObjects({
			className: 'User',
			data: [
				{
					name: 'John',
					age: 20,
				},
			],
			context,
		})

		const res = await postgresAdapter.updateObjects({
			className: 'User',
			where: {
				name: { equalTo: 'John' },
			},
			data: { name: 'Doe' },
			select: {},
			context,
		})

		expect(res[0]?.id).toBeDefined()
		expect(res).toEqual([{ id: expect.any(String) }])
	})

	it("should order the result by the field 'name' in ascending order", async () => {
		await postgresAdapter.createObjects({
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

		const res = await postgresAdapter.getObjects({
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
		await postgresAdapter.createObjects({
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

		const res = await postgresAdapter.getObjects({
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
		await postgresAdapter.createObjects({
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

		const res = await postgresAdapter.getObjects({
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
		const res = await postgresAdapter.count({
			className: 'User',
			context,
		})

		expect(res).toEqual(0)

		await postgresAdapter.createObjects({
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

		const res2 = await postgresAdapter.count({
			className: 'User',
			context,
		})

		expect(res2).toEqual(2)

		const res3 = await postgresAdapter.count({
			className: 'User',
			context,
			where: { age: { equalTo: 20 } },
		})

		expect(res3).toEqual(1)
	})

	it('should clear all database except Role collection', async () => {
		await postgresAdapter.createObjects({
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

		await postgresAdapter.createObjects({
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

		await postgresAdapter.clearDatabase()

		const res = await postgresAdapter.getObjects({
			className: 'User',
			select: {},
			context,
		})

		const res2 = await postgresAdapter.getObjects({
			className: '_Session',
			select: {},
			context,
		})

		const res3 = await postgresAdapter.getObjects({
			className: 'Role',
			select: { id: true },
			context,
		})

		expect(res.length).toEqual(0)
		expect(res2.length).toEqual(0)
		expect(res3.length).not.toEqual(0)
	})

	it('should support where on getObject for additional check (acl for example)', async () => {
		const insertedObjects = await postgresAdapter.createObjects({
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
			postgresAdapter.getObject({
				className: 'User',
				where: {
					name: { equalTo: 'InvalidName' },
				},
				id: insertedObjects[0]?.id || '',
				context,
			})
		).rejects.toThrow('Object not found')

		const res = await postgresAdapter.getObject({
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
		const insertedObjects = await postgresAdapter.createObjects({
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
			postgresAdapter.updateObject({
				className: 'User',
				where: {
					name: { equalTo: 'InvalidName' },
				},
				id: insertedObjects[0]?.id || '',
				context,
				data: { name: 'Lucas2' },
			})
		).rejects.toThrow('Object not found or where clause not satisfied')

		const { id } = await postgresAdapter.updateObject({
			className: 'User',
			where: {
				name: { equalTo: 'Lucas' },
			},
			id: insertedObjects[0]?.id || '',
			context,
			data: { name: 'Lucas2' },
		})

		const updatedObject = await postgresAdapter.getObject({
			className: 'User',
			id,
			select: { id: true, name: true },
			context,
		})

		expect(updatedObject?.name).toEqual('Lucas2')
	})

	it('should support where on delete for additional check (acl for example)', async () => {
		const insertedObjects = await postgresAdapter.createObjects({
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
			postgresAdapter.deleteObject({
				className: 'User',
				where: {
					name: { equalTo: 'InvalidName' },
				},
				id: insertedObjects[0]?.id || '',
				context,
			})
		).rejects.toThrow('Object not found')

		await postgresAdapter.deleteObject({
			className: 'User',
			where: {
				name: { equalTo: 'Lucas' },
			},
			id: insertedObjects[0]?.id || '',
			context,
		})
	})

	it('should support notEqualTo on id', async () => {
		const insertedObjects = await postgresAdapter.createObjects({
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

		const res = await postgresAdapter.getObjects({
			className: 'User',
			where: {
				id: { notEqualTo: insertedObjects[0]?.id },
			},
			context,
		})

		expect(res.length).toEqual(1)
	})

	it('should support equalTo on id', async () => {
		const insertedObjects = await postgresAdapter.createObjects({
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

		const res = await postgresAdapter.getObjects({
			className: 'User',
			where: {
				id: { equalTo: insertedObjects[0]?.id },
			},
			context,
		})

		expect(res.length).toEqual(1)
	})

	it('should support in aggregation on id', async () => {
		const insertedObjects = await postgresAdapter.createObjects({
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

		const res = await postgresAdapter.getObjects({
			className: 'User',
			where: {
				id: {
					in: insertedObjects.map((obj) => obj?.id).filter(notEmpty),
				},
			},
			context,
		})

		expect(res.length).toEqual(2)
	})

	it('should support notIn aggregation on id', async () => {
		const insertedObjects = await postgresAdapter.createObjects({
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

		const res = await postgresAdapter.getObjects({
			className: 'User',
			where: {
				id: {
					notIn: insertedObjects
						.map((obj) => obj?.id)
						.filter(notEmpty),
				},
			},
			context,
		})

		expect(res.length).toEqual(0)
	})

	it('should always return id', async () => {
		const insertedObjects = await postgresAdapter.createObjects({
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
		const insertedObjects = await postgresAdapter.createObjects({
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

	it('should getObjects using id', async () => {
		const insertedObjects = await postgresAdapter.createObjects({
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

		const res = await postgresAdapter.getObjects({
			className: 'User',
			where: {
				id: {
					equalTo: insertedObjects[0]?.id || '',
				},
			},
			context,
		})

		expect(res.length).toEqual(1)
	})

	it('should getObjects with limit and offset', async () => {
		await postgresAdapter.createObjects({
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

		const res = await postgresAdapter.getObjects({
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
		await postgresAdapter.createObjects({
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

		const res = await postgresAdapter.getObjects({
			className: 'User',
			select: { name: true },
			context,
			where: {},
		})

		expect(res.length).toEqual(5)
	})

	it('should get the id of an object', async () => {
		const insertedObject = await postgresAdapter.createObject({
			className: 'User',
			data: {
				name: 'John',
				age: 20,
			},
			select: { name: true, id: true },
			context,
		})

		const res = await postgresAdapter.getObject({
			id: insertedObject?.id.toString() || '',
			className: 'User',
			select: { id: true },
			context,
		})

		expect(res?.id).toEqual(insertedObject?.id || '')
	})

	it('should get all fields when no select is specified', async () => {
		const insertedObject = await postgresAdapter.createObject({
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

		const res = await postgresAdapter.getObject({
			className: 'User',
			id: id.toString(),
			context,
		})

		expect(res).toEqual(
			expect.objectContaining({
				name: 'John',
				age: 20,
				id: expect.any(String),
			})
		)
	})

	it('should get one object with specific field', async () => {
		const insertedObject = await postgresAdapter.createObject({
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

		const field = await postgresAdapter.getObject({
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

	it('should get all object with specific field', async () => {
		const objects = await postgresAdapter.getObjects({
			className: 'User',
			select: { name: true },
			context,
		})

		expect(objects.length).toEqual(0)

		await postgresAdapter.createObject({
			className: 'User',
			data: {
				name: 'John1',
				age: 20,
			},
			select: { name: true },
			context,
		})

		await postgresAdapter.createObject({
			className: 'User',
			data: {
				name: 'John2',
				age: 20,
			},
			select: { name: true },
			context,
		})

		const objects2 = await postgresAdapter.getObjects({
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

		const objects3 = await postgresAdapter.getObjects({
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
		await postgresAdapter.createObject({
			className: 'User',
			data: {
				name: 'John1',
				age: 20,
			},
			select: { name: true },
			context,
		})

		await postgresAdapter.createObject({
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
			await postgresAdapter.getObjects({
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
			})
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
			await postgresAdapter.getObjects({
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
			})
		).toEqual([
			{
				id: expect.any(String),
				name: 'John1',
				age: 20,
			},
		])

		// AND statement
		expect(
			await postgresAdapter.getObjects({
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
			})
		).toEqual([
			{
				id: expect.any(String),
				name: 'John1',
				age: 20,
			},
		])

		expect(
			await postgresAdapter.getObjects({
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
			})
		).toEqual([])

		// Equal to statement
		expect(
			await postgresAdapter.getObjects({
				className: 'User',
				where: {
					name: { equalTo: 'John1' },
				},
				select: { name: true, id: true, age: true },
				context,
			})
		).toEqual([
			{
				id: expect.any(String),
				name: 'John1',
				age: 20,
			},
		])

		expect(
			await postgresAdapter.getObjects({
				className: 'User',
				where: {
					age: { greaterThan: 21 },
				},
				context,
			})
		).toEqual([])

		// Not equal to statement
		expect(
			await postgresAdapter.getObjects({
				className: 'User',
				where: {
					name: { notEqualTo: 'John1' },
				},
				select: { name: true, id: true, age: true },
				context,
			})
		).toEqual([
			{
				id: expect.any(String),
				name: 'John2',
				age: 20,
			},
		])

		// Less than to statement on number
		expect(
			await postgresAdapter.getObjects({
				className: 'User',
				where: {
					age: { lessThan: 30 },
				},
				select: { name: true, id: true, age: true },
				context,
			})
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
			await postgresAdapter.getObjects({
				className: 'User',
				where: {
					age: { equalTo: 20 },
				},
				select: { name: true, id: true, age: true },
				context,
			})
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
			postgresAdapter.getObject({
				className: 'User',
				id: 'non-existing-id',
				select: { name: true },
				context,
			})
		).rejects.toThrow('Object not found')
	})

	it('should create object and return the created object', async () => {
		const { id } = await postgresAdapter.createObject({
			className: 'User',
			data: {
				name: 'Lucas',
				age: 23,
			},
			select: { age: true, id: true },
			context,
		})

		const insertedObject = await postgresAdapter.getObject({
			className: 'User',
			id,
			select: { age: true, id: true },
			context,
		})

		expect(insertedObject).toEqual({ age: 23, id: expect.any(String) })

		const { id: id2 } = await postgresAdapter.createObject({
			className: 'User',
			data: {
				name: 'Lucas2',
				age: 24,
			},
			select: { name: true, id: true, age: true },
			context,
		})

		const insertedObject2 = await postgresAdapter.getObject({
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
		await postgresAdapter.createObjects({
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

		const insertedObjects = await postgresAdapter.getObjects({
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

	it('should create multiple objects and return an array of the created object with all fields', async () => {
		await postgresAdapter.createObjects({
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

		const insertedObjects = await postgresAdapter.getObjects({
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
		const insertedObject = await postgresAdapter.createObject({
			className: 'User',
			data: {
				name: 'John',
				age: 20,
			},
			context,
		})

		if (!insertedObject) fail()

		const id = insertedObject.id

		await postgresAdapter.updateObject({
			className: 'User',
			id: id.toString(),
			data: { name: 'Doe' },
			select: { name: true, id: true },
			context,
		})

		const updatedObject = await postgresAdapter.getObject({
			className: 'User',
			id: id.toString(),
			select: { name: true, id: true },
			context,
		})

		expect(updatedObject).toEqual({
			name: 'Doe',
			id: expect.any(String),
		})

		await postgresAdapter.updateObject({
			className: 'User',
			id: id.toString(),
			data: { name: 'Doe' },
			select: { name: true, id: true, age: true },
			context,
		})

		const updatedObject2 = await postgresAdapter.getObject({
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
		const insertedObjects = await postgresAdapter.createObjects({
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

		await postgresAdapter.updateObjects({
			className: 'User',
			where: {
				name: { equalTo: 'Lucas' },
			},
			data: { name: 'Doe' },
			select: { name: true, id: true },
			context,
		})

		const updatedObjects = await postgresAdapter.getObjects({
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

		await postgresAdapter.updateObjects({
			className: 'User',
			where: {
				age: { greaterThanOrEqualTo: 20 },
			},
			data: { age: 23 },
			select: { name: true, id: true, age: true },
			context,
		})

		const updatedObjects2 = await postgresAdapter.getObjects({
			className: 'User',
			where: {
				age: {
					greaterThanOrEqualTo: 23,
				},
			},
			select: { age: true, name: true, id: true },
			context,
		})

		expect(updatedObjects2).toEqual([
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
		])
	})

	it('should update the same field of an objet that which we use in the where field', async () => {
		const insertedObject = await postgresAdapter.createObject({
			className: 'User',
			data: {
				name: 'John',
				age: 20,
			},
			context,
		})

		if (!insertedObject) fail()

		await postgresAdapter.updateObjects({
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

		const updatedObjects = await postgresAdapter.getObjects({
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
		const insertedObject = await postgresAdapter.createObject({
			className: 'User',
			data: {
				name: 'John',
				age: 20,
			},
			context,
		})

		if (!insertedObject) fail()

		const id = insertedObject.id

		await postgresAdapter.deleteObject({
			className: 'User',
			id: id.toString(),
			select: { name: true, id: true, age: true },
			context,
		})

		expect(
			postgresAdapter.getObject({
				className: 'User',
				id: id.toString(),
				context,
			})
		).rejects.toThrow('Object not found')
	})

	it('should delete multiple object', async () => {
		await postgresAdapter.createObject({
			className: 'User',
			data: {
				name: 'John',
				age: 18,
			},
			context,
		})

		await postgresAdapter.createObject({
			className: 'User',
			data: {
				name: 'Lucas',
				age: 18,
			},
			context,
		})

		await postgresAdapter.deleteObjects({
			className: 'User',
			where: { age: { equalTo: 18 } },
			select: { name: true, id: true, age: true },
			context,
		})

		const resAfterDelete = await postgresAdapter.getObjects({
			className: 'User',
			where: { age: { equalTo: 18 } },
			context,
		})

		expect(resAfterDelete.length).toEqual(0)
	})

	it('should build where query for postgres adapter', () => {
		const { query, values } = buildPostgresWhereQueryAndValues({
			name: { equalTo: 'John' },
			age: { greaterThan: 20 },
			OR: [
				{
					age: { lessThan: 10 },
				},
				{
					name: { equalTo: 'John' },
				},
			],
			AND: [
				{
					age: { lessThan: 10 },
				},
				{
					name: { equalTo: 'John' },
				},
			],
		})

		expect(query).toBeTruthy()
		expect(values.length).toBeGreaterThan(0)
		expect(query).toContain('name =')
		expect(query).toContain('age >')
		expect(query).toContain('OR')
		expect(query).toContain('AND')
	})

	it('should build empty where query for postgres adapter if where is empty', () => {
		const { query, values } = buildPostgresWhereQueryAndValues({})

		expect(query).toEqual('')
		expect(values).toEqual([])
	})

	it('should request nested objects in object', async () => {
		await postgresAdapter.createObject({
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

		const res = await postgresAdapter.getObjects({
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
		expect(res[0]?.authentication?.emailPassword?.email).toEqual(
			'email@test.fr'
		)
		expect(res[0]?.authentication?.emailPassword?.password).toEqual(
			'password'
		)
	})
})
