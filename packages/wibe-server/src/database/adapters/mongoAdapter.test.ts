import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { fail } from 'assert'
import { getMongoAdapter } from '../../utils/testHelper'
import { MongoAdapter } from './MongoAdapter'

describe('Mongo adapter', () => {
	let mongoAdapter: MongoAdapter

	beforeAll(async () => {
		mongoAdapter = await getMongoAdapter()
	})

	afterAll(async () => {
		await mongoAdapter.close()
	})

	it('should create class', async () => {
		expect((await mongoAdapter.database?.collections())?.length).toBe(0)

		await mongoAdapter.createClass('User')

		const collections = await mongoAdapter.database?.collections()

		if (!collections) fail()

		expect((await mongoAdapter.database?.collections())?.length).toBe(1)
		expect(collections[0].collectionName).toBe('User')
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

	it('should insert object and get object', async () => {
		const id = await mongoAdapter.insertObject({
			className: 'User',
			data: {
				name: 'John',
				age: 20,
			},
		})

		const field = await mongoAdapter.getObject<'User'>({
			className: 'User',
			id: id.toString(),
			fields: ['name'],
		})

		expect(id).toBeDefined()
		expect(id._bsontype).toEqual('ObjectId')

		expect(field).toEqual({
			_id: expect.anything(),
			name: 'John',
		})
	})

	it.skip("should not get object if the object doesn't exist", async () => {
		// TODO : rejects bug : make this test when bun is updated to support .rejects
		// expect(
		// 	async () =>
		// 		await mongoAdapter.getObject({
		// 			className: 'Collection1',
		// 			id: '5f9b3b3b3b3b3b3b3b3b3b3b',
		// 			fields: ['name'],
		// 		}),
		// ).toThrow(new Error('Object not found'))
	})

	it('should update object', async () => {
		const id = await mongoAdapter.insertObject({
			className: 'User',
			data: {
				name: 'John',
				age: 20,
			},
		})

		const res = await mongoAdapter.updateObject({
			className: 'User',
			id: id.toString(),
			data: { name: 'Doe' },
		})

		const field = await mongoAdapter.getObject<'User'>({
			className: 'User',
			id: id.toString(),
			fields: ['name'],
		})

		expect(res.modifiedCount).toEqual(1)
		expect(field.name).toEqual('Doe')
	})
})
