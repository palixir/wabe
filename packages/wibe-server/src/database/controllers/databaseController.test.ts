import { describe, it, expect, spyOn, beforeAll, afterAll } from 'bun:test'
import { MongoAdapter } from '../adapters/MongoAdapter'
import { closeTests, setupTests } from '../../utils/helper'
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
			'createClassIfNotExist',
		).mockResolvedValue({} as any)

		await WibeApp.databaseController.createClassIfNotExist('Collection1')

		expect(spyMongoAdapterCreateClass).toHaveBeenCalledTimes(1)
	})
})
