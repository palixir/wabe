import { describe, expect, it, spyOn } from 'bun:test'
import { v4 as uuid } from 'uuid'
import getPort from 'get-port'
import { Wabe } from '.'
import { DatabaseEnum } from '../database'
import { Schema } from '../schema'

describe('Server', () => {
	it('should run server', async () => {
		const databaseId = uuid()

		const port = await getPort()
		const wabe = new Wabe({
			rootKey:
				'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
			database: {
				type: DatabaseEnum.Mongo,
				url: 'mongodb://127.0.0.1:27045',
				name: databaseId,
			},
			port,
			schema: {
				classes: [
					{
						name: 'Collection1',
						fields: { name: { type: 'String' } },
					},
				],
			},
		})

		await wabe.start()

		const res = await fetch(`http://127.0.0.1:${port}/health`)

		expect(res.status).toEqual(200)
		await wabe.close()
	})

	it('should run server without schema object', async () => {
		const databaseId = uuid()

		const port = await getPort()
		const wabe = new Wabe({
			rootKey:
				'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
			database: {
				type: DatabaseEnum.Mongo,
				url: 'mongodb://127.0.0.1:27045',
				name: databaseId,
			},
			port,
		})

		await wabe.start()

		const res = await fetch(`http://127.0.0.1:${port}/health`)

		expect(res.status).toEqual(200)
		await wabe.close()
	})

	it('should update the schema to static Wabe after the Schema initialization', async () => {
		const spySchemaDefaultClass = spyOn(Schema.prototype, 'defaultClass')
		const spySchemaDefaultEnum = spyOn(Schema.prototype, 'defaultEnum')

		const databaseId = uuid()

		const port = await getPort()

		const wabe = new Wabe({
			rootKey:
				'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
			database: {
				type: DatabaseEnum.Mongo,
				url: 'mongodb://127.0.0.1:27045',
				name: databaseId,
			},
			port,
			schema: {
				classes: [
					{
						name: 'Collection1',
						fields: { name: { type: 'String' } },
					},
				],
			},
		})

		await wabe.start()

		// _Session class is a default class so if it's present the schema is updated
		const isSessionClassExist = wabe.config.schema.classes.find(
			(schemaClass) => schemaClass.name === '_Session',
		)

		expect(isSessionClassExist).not.toBeUndefined()

		expect(spySchemaDefaultClass).toHaveBeenCalledTimes(1)
		expect(spySchemaDefaultEnum).toHaveBeenCalledTimes(1)

		await wabe.close()
	})
})
