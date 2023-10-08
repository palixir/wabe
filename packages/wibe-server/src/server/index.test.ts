import { describe, expect, it } from 'bun:test'
import { WibeApp } from '.'
import { DatabaseEnum } from '../database'

describe('Server', () => {
	it('should run server', async () => {
		const wibe = new WibeApp({
			database: {
				type: DatabaseEnum.Mongo,
				url: 'mongodb://localhost:27017',
				name: 'wibe',
			},
			port: 3000,
			schema: [
				{ name: 'Collection1', fields: { name: { type: 'String' } } },
			],
		})

		const res = await fetch('http://127.0.0.1:3000/health')

		expect(res.status).toEqual(200)
		await wibe.close()
	})

	it('should call the schema creation', () => {
		const wibe = new WibeApp({
			database: {
				type: DatabaseEnum.Mongo,
				url: 'mongodb://localhost:27017',
				name: 'wibe',
			},
			port: 3000,
			schema: [
				{
					name: 'Collection 1',
					fields: {
						name: { type: 'String' },
						age: { type: 'Int' },
					},
				},
			],
		})

		// Step 1 : Create an array of schema
		// Step 2 : Fill the database with all the fields
		// Step 3 : Create a GraphQL schema
	})
})
