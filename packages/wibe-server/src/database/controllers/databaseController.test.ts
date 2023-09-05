import * as databaseController from './databaseController'
import { MongoAdapter } from '../adapters/mongoAdapter'

describe('databaseController', () => {
	it('should call the connect adapter', async () => {
		const spyDatabaseController = jest.spyOn(
			databaseController,
			'DatabaseController',
		)

		const mongoAdapter = MongoAdapter({
			url: 'mongodb://localhost:27017',
		})

		databaseController.DatabaseController(mongoAdapter)

		expect(spyDatabaseController).toHaveBeenCalledTimes(1)
	})
})
