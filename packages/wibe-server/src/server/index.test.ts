import { describe, expect, it, spyOn } from 'bun:test'
import { v4 as uuid } from 'uuid'
import getPort from 'get-port'
import { WibeApp } from '.'
import { DatabaseEnum } from '../database'
import { Schema } from '../schema'

describe('Server', () => {
	it('should provide a root key with a length >= 64 characters', async () => {
		const databaseId = uuid()

		const port = await getPort()
		const wibe = new WibeApp({
			rootKey: 'test',
			database: {
				type: DatabaseEnum.Mongo,
				url: 'mongodb://127.0.0.1:27045',
				name: databaseId,
			},
			port,
			schema: {
				class: [
					{
						name: 'Collection1',
						fields: { name: { type: 'String' } },
					},
				],
			},
		})

		expect(wibe.start()).rejects.toThrow(
			'Root key need to be greater or equal than 64 characters',
		)
	})

	it('should run server', async () => {
		const databaseId = uuid()

		const port = await getPort()
		const wibe = new WibeApp({
			rootKey:
				'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
			database: {
				type: DatabaseEnum.Mongo,
				url: 'mongodb://127.0.0.1:27045',
				name: databaseId,
			},
			port,
			schema: {
				class: [
					{
						name: 'Collection1',
						fields: { name: { type: 'String' } },
					},
				],
			},
		})

		await wibe.start()

		const res = await fetch(`http://127.0.0.1:${port}/health`)

		expect(res.status).toEqual(200)
		await wibe.close()
	})

	it('should update the schema to static WibeApp after the Schema initialization', async () => {
		const spySchemaDefaultClass = spyOn(Schema.prototype, 'defaultClass')
		const spySchemaDefaultEnum = spyOn(Schema.prototype, 'defaultEnum')

		const databaseId = uuid()

		const port = await getPort()

		const wibe = new WibeApp({
			rootKey:
				'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
			database: {
				type: DatabaseEnum.Mongo,
				url: 'mongodb://127.0.0.1:27045',
				name: databaseId,
			},
			port,
			schema: {
				class: [
					{
						name: 'Collection1',
						fields: { name: { type: 'String' } },
					},
				],
			},
		})

		await wibe.start()

		// _Session class is a default class so if it's present the schema is updated
		const isSessionClassExist = WibeApp.config.schema.class.find(
			(schemaClass) => schemaClass.name === '_Session',
		)

		expect(isSessionClassExist).not.toBeUndefined()

		expect(spySchemaDefaultClass).toHaveBeenCalledTimes(1)
		expect(spySchemaDefaultEnum).toHaveBeenCalledTimes(1)

		await wibe.close()
	})
})
