import { Elysia } from 'elysia'
import { apollo, gql } from '@elysiajs/apollo'
import { DatabaseConfig, DatabaseEnum } from '../database'
import { SchemaInterface } from '../schema/interface'
import { Schema } from '../schema'
import { DatabaseController } from '../database/controllers/DatabaseController'
import { SchemaRouterController } from '../schema/controllers/SchemaRouterController'
import { GraphQLSchemaAdapter, SchemaRouterAdapter } from '../schema/adapters'
import { makeSchema } from 'nexus'
import { MongoAdapter } from '../database/adapters/MongoAdapter'
import { join } from 'path'

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
		const types = schemaRouterController.createSchema()

		const graphqlSchema = makeSchema({
			types,
			outputs: {
				schema: join(
					// @ts-ignore
					import.meta.dir,
					'../../generated/schema.graphql',
				),
				typegen: join(
					// @ts-ignore
					import.meta.dir,
					'../../generated/nexusTypegen.ts',
				),
			},
		})

		this.server.use(apollo({ schema: graphqlSchema }))

		this.server.listen(this.config.port, () => {
			console.log(`Server running on port ${this.config.port}`)
		})
	}

	async close() {
		return this.server.stop()
	}
}
