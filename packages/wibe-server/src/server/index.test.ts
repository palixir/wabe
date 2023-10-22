import { describe, expect, it } from 'bun:test'
import getPort from 'get-port'
import { WibeApp } from '.'
import { DatabaseEnum } from '../database'

describe('Server', () => {
	it('should run server', async () => {
		const port = await getPort()
		const wibe = new WibeApp({
			database: {
				type: DatabaseEnum.Mongo,
				url: 'mongodb://localhost:27017',
				name: 'wibe',
			},
			port,
			schema: [
				{ name: 'Collection1', fields: { name: { type: 'String' } } },
			],
		})

		await wibe.start()

		const res = await fetch(`http://127.0.0.1:${port}/health`)

		expect(res.status).toEqual(200)
		await wibe.close()
	})
})
