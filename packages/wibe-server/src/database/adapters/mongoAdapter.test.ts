import { describe, it, expect, beforeAll, afterAll } from 'bun:test'
import { fail } from 'assert'
import { closeTests, setupTests } from '../../utils/testHelper'
import { MongoAdapter } from './MongoAdapter'
import { WibeApp } from '../../server'

describe('Mongo adapter', () => {
	let mongoAdapter: MongoAdapter
	let wibe: WibeApp

	beforeAll(async () => {
		const setup = await setupTests()
		wibe = setup.wibe

		mongoAdapter = wibe.databaseController.adapter as MongoAdapter
	})

	afterAll(async () => {
		await closeTests(wibe)
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

	it('should get object with specific field and * fields', async () => {
		const insertedObject = await mongoAdapter.insertObject<'User'>({
			className: 'User',
			data: {
				name: 'John',
				age: 20,
			},
			fields: ['name'],
		})

		if (!insertedObject) fail()

		const id = insertedObject._id

		expect(id).toBeDefined()
		expect(id._bsontype).toEqual('ObjectId')

		const field = await mongoAdapter.getObject<'User'>({
			className: 'User',
			id: id.toString(),
			fields: ['name'],
		})

		expect(field).toEqual({
			_id: expect.anything(),
			name: 'John',
		})

		const allFields = await mongoAdapter.getObject<'User'>({
			className: 'User',
			id: id.toString(),
			fields: ['*'],
		})

		expect(allFields).toEqual({
			_id: expect.anything(),
			name: 'John',
			age: 20,
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

	it('should insert object and return the created object', async () => {
		const insertedObject = await mongoAdapter.insertObject<'User'>({
			className: 'User',
			data: {
				name: 'Lucas',
				age: 23,
			},
			fields: ['age'],
		})

		expect(insertedObject).toEqual({ age: 23, _id: expect.anything() })

		const insertedObject2 = await mongoAdapter.insertObject<'User'>({
			className: 'User',
			data: {
				name: 'Lucas2',
				age: 24,
			},
			fields: ['*'],
		})

		expect(insertedObject2).toEqual({
			age: 24,
			_id: expect.anything(),
			name: 'Lucas2',
		})
	})

	it('should update object', async () => {
		const insertedObject = await mongoAdapter.insertObject<'User'>({
			className: 'User',
			data: {
				name: 'John',
				age: 20,
			},
			fields: ['*'],
		})

		if (!insertedObject) fail()

		const id = insertedObject._id

		const updatedObject = await mongoAdapter.updateObject<'User'>({
			className: 'User',
			id: id.toString(),
			data: { name: 'Doe' },
			fields: ['name'],
		})

		if (!updatedObject) fail()

		expect(updatedObject).toEqual({
			_id: expect.anything(),
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
			_id: expect.anything(),
			name: 'Doe',
			age: 20,
		})
	})
})
