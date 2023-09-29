import { beforeAll, describe, it, expect } from 'bun:test'
import { MongoAdapter } from './mongoAdapter'
import { Schema } from '../../schema'
import { testSetup } from '../../utils/testHelper'
import { fail } from 'assert'

describe('Mongo adapter', () => {
	let mongoAdapter: MongoAdapter

	beforeAll(async () => {
		const port = await testSetup()

		mongoAdapter = new MongoAdapter({
			databaseUrl: `mongodb://127.0.0.1:${port}`,
			databaseName: 'test',
		})

		await mongoAdapter.connect()
	})

	it('should create class', async () => {
		expect((await mongoAdapter.database?.collections())?.length).toBe(0)

		await mongoAdapter.createClass('Collection1')

		const collections = await mongoAdapter.database?.collections()

		if (!collections) fail()

		expect((await mongoAdapter.database?.collections())?.length).toBe(1)
		expect(collections[0].collectionName).toBe('Collection1')
	})

	it("should not create class if it's not connected", async () => {
		mongoAdapter.database = undefined

		expect(
			async () => await mongoAdapter.createClass('Collection1'),
		).toThrow(Error('Connection to database is not established'))
	})

	// it('should fill database', async () => {
	// 	const schemas: Schema[] = [
	// 		{
	// 			name: 'Collection1',
	// 			fields: {
	// 				name: { type: 'string', defaultValue: 'Lucas' },
	// 				age: { type: 'number', defaultValue: 23 },
	// 			},
	// 		},
	// 		{
	// 			name: 'Collection2',
	// 			fields: {
	// 				country: { type: 'string', defaultValue: 'France' },
	// 				city: { type: 'string', defaultValue: 'Paris' },
	// 			},
	// 		},
	// 	]

	// 	expect((await mongoAdapter.database?.collections())?.length).toBe(0)

	// 	await mongoAdapter.fillDatabase(schemas)

	// 	expect((await mongoAdapter.database?.collections())?.length).toBe(2)
	// })

	// it("should not fill database if it's not connected", async () => {
	// 	mongoAdapter.database = undefined

	// 	expect(async () => await mongoAdapter.fillDatabase([])).toThrow(
	// 		Error('Connection to database is not established'),
	// 	)
	// })
})
