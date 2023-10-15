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
})
