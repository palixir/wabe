import { describe, it, expect, spyOn } from 'bun:test'
import { DatabaseController } from './databaseController'
import { MongoAdapter } from '../adapters/mongoAdapter'

describe('databaseController', () => {
	it('should call the connect adapter', async () => {
		// TODO : tricks to test before #4482 resolved
		const obj = { DatabaseController }
		const spyDatabaseController = spyOn(obj, 'DatabaseController')

		const mongoAdapter = MongoAdapter({
			url: 'mongodb://localhost:27017',
		})

		obj.DatabaseController(mongoAdapter)

		expect(spyDatabaseController).toHaveBeenCalledTimes(1)
	})
})
