import type { DatabaseConfig } from '../database'
import { DatabaseController } from '../database/controllers/DatabaseController'
import { MongoAdapter } from '../database/adapters/MongoAdapter'
import { Schema, type SchemaInterface } from '../schema/Schema'
import { GraphQLObjectType, GraphQLSchema, printSchema } from 'graphql'
import { GraphQLSchema as WibeGraphQLSchema } from '../graphql'
import type { AuthenticationConfig } from '../authentication/interface'
import { type WibeRoute, defaultRoutes } from './routes'
import { type Hook, defaultHooks } from '../hooks'
import { generateWibeFile } from './generateWibeFile'
import { defaultAuthenticationMethods } from '../authentication/defaultAuthentication'
import { Wobe } from 'wobe'
import { WobeGraphqlYogaPlugin } from 'wobe-graphql-yoga'

interface WibeConfig {
	port: number
	schema: SchemaInterface
	database: DatabaseConfig
	codegen?: boolean
	authentication?: AuthenticationConfig
	routes?: WibeRoute[]
	wibeKey: string
	hooks?: Hook<any>[]
}

export class WibeApp {
	private server: Wobe

	static config: WibeConfig
	static databaseController: DatabaseController

	constructor({
		port,
		schema,
		database,
		codegen = true,
		authentication,
		wibeKey,
		hooks,
	}: WibeConfig) {
		WibeApp.config = {
			port,
			schema,
			database,
			codegen,
			authentication,
			wibeKey,
			hooks,
		}

		this.server = new Wobe().get('/health', (context) => {
			context.res.status = 200
			context.res.send('OK')
		})

		const databaseAdapter = new MongoAdapter({
			databaseName: database.name,
			databaseUrl: database.url,
		})

		WibeApp.databaseController = new DatabaseController(databaseAdapter)

		this.loadDefaultRoutes()
		this.loadHooks()
		this.loadAuthenticationMethods()
	}

	loadAuthenticationMethods() {
		WibeApp.config.authentication = {
			...WibeApp.config.authentication,
			customAuthenticationMethods: [
				...defaultAuthenticationMethods(),
				...(WibeApp.config.authentication
					?.customAuthenticationMethods || []),
			],
		}
	}

	loadHooks() {
		WibeApp.config.hooks = [
			...defaultHooks,
			...(WibeApp.config.hooks || []),
		]
	}

	loadDefaultRoutes() {
		const wibeRoutes = defaultRoutes()

		wibeRoutes.map((route) => {
			const { method } = route

			switch (method) {
				case 'GET':
					this.server.get(route.path, route.handler)
					break
				case 'POST':
					this.server.post(route.path, route.handler)
					break
				case 'PUT':
					this.server.put(route.path, route.handler)
					break
				case 'DELETE':
					this.server.delete(route.path, route.handler)
					break
				default:
					throw new Error('Invalid method for default route')
			}
		})
	}

	async start() {
		await WibeApp.databaseController.connect()

		const wibeSchema = new Schema(WibeApp.config.schema)

		WibeApp.config.schema = wibeSchema.schema

		const graphqlSchema = new WibeGraphQLSchema(wibeSchema)

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
			types: [...types.scalars, ...types.enums, ...types.objects],
		})

		this.server.usePlugin(
			WobeGraphqlYogaPlugin({
				schema,
				maskedErrors: false,
				context: (obj) => {
					console.log('tata')
					console.log(obj)
					return {
						sessionId: 'fakeSessionId',
						user: {
							id: 'fakeId',
							email: 'fakeEmail',
						},
					}
				},
			})
		)

		if (
			process.env.NODE_ENV !== 'production' &&
			process.env.NODE_ENV !== 'test' &&
			WibeApp.config.codegen
		) {
			const contentOfCodegenFile = await Bun.file(
				'generated/wibe.ts'
			).text()

			if (!contentOfCodegenFile.includes('WibeSchemaTypes'))
				Bun.write(
					'generated/wibe.ts',
					`${contentOfCodegenFile}\n\n${generateWibeFile({
						scalars: wibeSchema.schema.scalars,
						enums: wibeSchema.schema.enums,
						schemas: wibeSchema.schema.class,
					})}`
				)
			Bun.write('generated/schema.graphql', printSchema(schema))
		}

		this.server.listen(WibeApp.config.port, ({ port }) => {
			console.log(`Server is running on port ${port}`)
		})
	}

	async close() {
		await WibeApp.databaseController.close()
		this.server.stop()
	}
}
