import { Elysia } from 'elysia'
import { DatabaseConfig } from '../database'
import { SchemaInterface } from '../schema/Schema'

interface WibeConfig {
	port: number
	schema: SchemaInterface[]
	database: DatabaseConfig
}

export class WibeApp {
	private config: WibeConfig
	private server: Elysia

	constructor(config: WibeConfig) {
		this.config = config

		this.server = new Elysia().get(
			'/health',
			(context) => (context.set.status = 200),
		)

		this.server.listen(this.config.port)
	}

	async close() {
		return this.server.stop()
	}
}
