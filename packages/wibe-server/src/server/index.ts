import { Elysia } from 'elysia'
import { apollo } from '@elysiajs/apollo'
import { DatabaseConfig } from '../database'
import { SchemaInterface } from '../schema/interface'
import { DatabaseController } from '../database/controllers/DatabaseController'
import { SchemaRouterController } from '../schema/controllers/SchemaRouterController'
import { makeSchema } from 'nexus'
import { MongoAdapter } from '../database/adapters/MongoAdapter'
import { join } from 'path'
import { GraphQLSchemaAdapter } from '../schema/adapters/GraphQLSchemaAdapter'
import { Schema } from '../schema/Schema'

interface WibeConfig {
	port: number
	schema: SchemaInterface[]
	database: DatabaseConfig
}

export class WibeApp {
	private config: WibeConfig
	private server: Elysia
	static databaseController: DatabaseController

	constructor(config: WibeConfig) {
		this.config = config

		this.server = new Elysia().get(
			'/health',
			(context) => (context.set.status = 200),
		)

		const databaseAdapter = new MongoAdapter({
			databaseName: this.config.database.name,
			databaseUrl: this.config.database.url,
		})

		WibeApp.databaseController = new DatabaseController(databaseAdapter)
	}

	static async getDatabaseController() {
		return WibeApp.databaseController
	}

	async start() {
		await WibeApp.databaseController.connect()

		const schemas = this.config.schema.map(
			(schema) =>
				new Schema({
					name: schema.name,
					fields: schema.fields,
					databaseController: WibeApp.databaseController,
				}),
		)

		const schemaRouterAdapter = new GraphQLSchemaAdapter(schemas)

		const schemaRouterController = new SchemaRouterController({
			adapter: schemaRouterAdapter,
		})

		const types = schemaRouterController.createSchema()

		const graphqlSchema = makeSchema({
			types,
			outputs: {
				schema: join(import.meta.dir, '../../generated/schema.graphql'),
				typegen: join(
					import.meta.dir,
					'../../generated/nexusTypegen.ts',
				),
			},
		})

		this.server.use(await apollo({ schema: graphqlSchema }))

		this.server.listen(this.config.port, () => {
			console.log(`Server running on port ${this.config.port}`)
		})
	}

	async close() {
		await WibeApp.databaseController.close()
		await this.server.stop()
	}
}
