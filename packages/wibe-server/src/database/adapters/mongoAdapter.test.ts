import { beforeAll, describe, it, expect } from 'bun:test'
import { runDatabase } from 'wibe-mongodb-launcher'
import { MongoAdapter } from './mongoAdapter'

describe('Mongo adapter', () => {
	let mongoAdapter: MongoAdapter

	beforeAll(async () => {
		const port = await runDatabase()
		mongoAdapter = new MongoAdapter({
			databaseUrl: `mongodb://127.0.0.1:${port}`,
		})
	})

	it('should fill database', () => {})
})
