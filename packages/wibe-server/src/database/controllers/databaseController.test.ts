import {
	describe,
	it,
	expect,
	spyOn,
	mock,
	beforeAll,
	afterAll,
} from 'bun:test'
import { MongoAdapter } from '../adapters/MongoAdapter'
import { DatabaseController } from './DatabaseController'
import { closeTests, setupTests } from '../../utils/testHelper'
import { WibeApp } from '../../server'

describe('DatabaseController', () => {
	let wibe: WibeApp

	beforeAll(async () => {
		const setup = await setupTests()
		wibe = setup.wibe
	})

	afterAll(async () => {
		await closeTests(wibe)
	})

	it('should call adapter for createClass', async () => {
		const spyMongoAdapterCreateClass = spyOn(
			MongoAdapter.prototype,
			'createClass',
		).mockResolvedValue()

		await WibeApp.databaseController.createClass('Collection1')

		expect(spyMongoAdapterCreateClass).toHaveBeenCalledTimes(1)
	})
})
