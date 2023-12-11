import { Elysia } from 'elysia'
import { apollo } from '@elysiajs/apollo'
import fs from 'fs'
import { DatabaseConfig } from '../database'
import { DatabaseController } from '../database/controllers/DatabaseController'
import { MongoAdapter } from '../database/adapters/MongoAdapter'
import { Schema, SchemaInterface } from '../schema/Schema'
import { GraphQLObjectType, GraphQLSchema } from 'graphql'
import { WibeGraphlQLSchema } from '../schema/WibeGraphQLSchema'

interface WibeConfig {
	port: number
	schema: SchemaInterface
	database: DatabaseConfig
}

export class WibeApp {
	private server: Elysia

	static config: WibeConfig
	static databaseController: DatabaseController

	constructor(config: WibeConfig) {
		WibeApp.config = config

		this.server = new Elysia().get('/health', (context) => {
			context.set.status = 200
		})

		const databaseAdapter = new MongoAdapter({
			databaseName: config.database.name,
			databaseUrl: config.database.url,
		})

		WibeApp.databaseController = new DatabaseController(databaseAdapter)
	}

	async start() {
		await WibeApp.databaseController.connect()

		const wibeSchema = new Schema(WibeApp.config.schema)

		const graphqlSchema = new WibeGraphlQLSchema(wibeSchema)

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
			types: types.scalars,
		})

		this.server.use(await apollo({ schema }))

		if (process.env.NODE_ENV === 'development') {
			// Generate Wibe types
			const wibeTypes = wibeSchema.getTypesFromSchema()

			fs.mkdirSync('generated', { recursive: true })
			fs.writeFileSync('generated/wibe.ts', wibeTypes, {})
		}

		this.server.listen(WibeApp.config.port, () => {
			console.log(`Server running on port ${WibeApp.config.port}`)
		})
	}

	async close() {
		await WibeApp.databaseController.close()
		await this.server.stop()
	}
}
