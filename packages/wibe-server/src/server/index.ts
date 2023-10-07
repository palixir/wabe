import { Elysia } from 'elysia'
import { apollo, gql } from '@elysiajs/apollo'
import { DatabaseConfig } from '../database'
import { SchemaInterface } from '../schema/interface'
import { Schema } from '../schema'
import { DatabaseController } from '../database/controllers/DatabaseController'
import { DatabaseAdapter } from '../database/adapters'
import { MongoAdapter } from '../database/adapters/MongoAdapter'
import { SchemaRouterController } from '../schema/controllers/SchemaRouterController'
import { GraphQLSchemaAdapter } from '../schema/adapters'
import { makeSchema } from 'nexus'

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

		const databaseAdapter = new MongoAdapter({
			databaseName: this.config.database.name,
			databaseUrl: this.config.database.url,
		})

		const databaseController = new DatabaseController(databaseAdapter)

		const schemas = this.config.schema.map(
			(schema) =>
				new Schema({
					name: schema.name,
					fields: schema.fields,
					databaseController,
				}),
		)

		const schemaRouterAdapter = new GraphQLSchemaAdapter(schemas)

		const schemaRouterController = new SchemaRouterController(
			schemaRouterAdapter,
		)
		const routerSchema = schemaRouterController.createSchema()

		const graphqlSchema = makeSchema({ types: routerSchema })

		this.server.use(apollo({ schema: graphqlSchema }))

		this.server.listen(this.config.port)
	}

	async close() {
		return this.server.stop()
	}
}
