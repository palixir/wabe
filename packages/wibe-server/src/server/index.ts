import { Elysia } from 'elysia'
import { apollo } from '@elysiajs/apollo'
import { DatabaseConfig } from '../database'
import { SchemaInterface } from '../schema/interface'
import { DatabaseController } from '../database/controllers/DatabaseController'
import { MongoAdapter } from '../database/adapters/MongoAdapter'
import { Schema } from '../schema/Schema'
import { GraphQLObjectType, GraphQLSchema } from 'graphql'
import { WibeGraphlQLSchema } from '../schema/controllers/WibeGraphQLSchema'

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

	async start() {
		await WibeApp.databaseController.connect()

		const schemas = this.config.schema.map(
			(schema) =>
				new Schema({
					name: schema.name,
					fields: schema.fields,
				}),
		)

		const graphqlSchema = new WibeGraphlQLSchema(schemas)

		const types = graphqlSchema.createSchema()

		const schema = new GraphQLSchema({
			query: new GraphQLObjectType({
				name: 'Query',
				fields: types.queries,
			}),
			mutation: new GraphQLObjectType({
				name: 'Mutation',
				fields: types.mutations,
			}),
		})

		this.server.use(await apollo({ schema }))

		this.server.listen(this.config.port, () => {
			console.log(`Server running on port ${this.config.port}`)
		})
	}

	async close() {
		await WibeApp.databaseController.close()
		await this.server.stop()
	}
}
