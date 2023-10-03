import { describe, it, expect, spyOn, mock } from 'bun:test'
import { MongoAdapter } from '../adapters/MongoAdapter'
import { DatabaseController } from './DatabaseController'
import { getMongoAdapter } from '../../utils/testHelper'

describe('DatabaseController', () => {
	it('should call adapter for createClass', async () => {
		const spyMongoAdapterCreateClass = spyOn(
			MongoAdapter.prototype,
			'createClass',
		).mockResolvedValue()

		const databaseController = new DatabaseController(
			await getMongoAdapter(),
		)

		await databaseController.createClass('Collection1')

		expect(spyMongoAdapterCreateClass).toHaveBeenCalledTimes(1)
	})
})
