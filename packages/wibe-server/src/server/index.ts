import type { DatabaseConfig } from '../database'
import { DatabaseController } from '../database/controllers/DatabaseController'
import { MongoAdapter } from '../database/adapters/MongoAdapter'
import { Schema, type SchemaInterface } from '../schema/Schema'
import { GraphQLObjectType, GraphQLSchema, printSchema } from 'graphql'
import { GraphQLSchema as WibeGraphQLSchema } from '../graphql'
import type { AuthenticationConfig } from '../authentication/interface'
import { type WibeRoute, defaultRoutes } from './routes'
import { type Hook, getDefaultHooks } from '../hooks'
import { generateWibeFile } from './generateWibeFile'
import { defaultAuthenticationMethods } from '../authentication/defaultAuthentication'
import { Wobe } from 'wobe'
import { WobeGraphqlYogaPlugin } from 'wobe-graphql-yoga'
import { Session } from '../authentication/Session'
import { getCookieInRequestHeaders } from '../utils'
import type { Context } from '../graphql/interface'
import { initializeRoles } from '../authentication/roles'
import type { FileConfig } from '../files'
import { fileDevAdapter } from '../files/devAdapter'

interface WibeConfig {
	port: number
	schema: SchemaInterface
	database: DatabaseConfig
	codegen?: {
		path?: string
	}
	authentication?: AuthenticationConfig
	routes?: WibeRoute[]
	rootKey: string
	hooks?: Hook<any>[]
	file?: FileConfig
}

export class WibeApp {
	private server: Wobe

	static config: WibeConfig
	static databaseController: DatabaseController

	constructor({
		port,
		schema,
		database,
		authentication,
		rootKey,
		codegen,
		hooks,
		file,
	}: WibeConfig) {
		WibeApp.config = {
			port,
			schema,
			database,
			codegen,
			authentication,
			rootKey,
			hooks,
			file: {
				adapter:
					file?.adapter ||
					((process.env.NODE_ENV !== 'production'
						? fileDevAdapter
						: () => {}) as any),
			},
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
			...getDefaultHooks(),
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
		if (WibeApp.config.rootKey.length < 64)
			throw new Error(
				'Root key need to be greater or equal than 64 characters',
			)

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
				// TODO: Maybe add cors here + the wobe cors for csrf on upload
				graphqlEndpoint: '/graphql',
				context: async ({ request }): Promise<Partial<Context>> => {
					const headers = request.headers

					if (headers.get('Wibe-Root-Key') === WibeApp.config.rootKey)
						return { isRoot: true }

					const getAccessToken = () => {
						const isCookieSession =
							!!WibeApp.config.authentication?.session
								?.cookieSession

						if (isCookieSession)
							return getCookieInRequestHeaders(
								'accessToken',
								request.headers,
							)

						return headers.get('Wibe-Access-Token')
					}

					const accessToken = getAccessToken()

					if (!accessToken)
						return {
							isRoot: false,
						}

					const session = new Session()

					const { user, sessionId } = await session.meFromAccessToken(
						accessToken,
						{ isRoot: true } as Context,
					)

					return {
						isRoot: false,
						sessionId,
						user,
					}
				},
				graphqlMiddleware: async (resolve, res) => {
					const response = await resolve()

					if (WibeApp.config.authentication?.session?.cookieSession) {
						// TODO : Add tests for this
						const accessToken = getCookieInRequestHeaders(
							'accessToken',
							res.request.headers,
						)

						const refreshToken = getCookieInRequestHeaders(
							'refreshToken',
							res.request.headers,
						)

						if (accessToken && refreshToken) {
							const session = new Session()

							const {
								accessToken: newAccessToken,
								refreshToken: newRefreshToken,
							} = await session.refresh(
								accessToken,
								refreshToken,
								{} as any,
							)

							if (accessToken !== newAccessToken)
								res.setCookie('accessToken', newAccessToken, {
									httpOnly: true,
									path: '/',
									expires: new Date(
										Date.now() +
											session.getAccessTokenExpireIn(),
									),
									secure:
										process.env.NODE_ENV === 'production',
								})

							if (refreshToken !== newRefreshToken)
								res.setCookie('refreshToken', newRefreshToken, {
									httpOnly: true,
									path: '/',
									expires: new Date(
										Date.now() +
											session.getRefreshTokenExpireIn(),
									),
									secure:
										process.env.NODE_ENV === 'production',
								})
						}
					}

					return response
				},
			}),
		)

		if (
			process.env.NODE_ENV !== 'production' &&
			process.env.NODE_ENV !== 'test' &&
			WibeApp.config.codegen
		) {
			const typeFile = `${import.meta.dirname}/generated/wibe.ts`

			const contentOfCodegenFile = await Bun.file(typeFile).text()

			if (!contentOfCodegenFile.includes('WibeSchemaTypes'))
				Bun.write(
					typeFile,
					`${contentOfCodegenFile}\n\n${generateWibeFile({
						scalars: wibeSchema.schema.scalars,
						enums: wibeSchema.schema.enums,
						schemas: wibeSchema.schema.class,
					})}`,
				)

			Bun.write(
				`${import.meta.dirname}/generated/schema.graphql`,
				printSchema(schema),
			)

			if (WibeApp.config.codegen.path) {
				Bun.write(WibeApp.config.codegen.path, printSchema(schema))
			}
		}

		await initializeRoles()

		this.server.listen(WibeApp.config.port, ({ port }) => {
			if (!process.env.TEST)
				console.log(`Server is running on port ${port}`)
		})
	}

	async close() {
		await WibeApp.databaseController.close()
		this.server.stop()
	}
}
