import type { DatabaseConfig } from '../database'
import { DatabaseController } from '../database/controllers/DatabaseController'
import { MongoAdapter } from '../database/adapters/MongoAdapter'
import { Schema, type SchemaInterface } from '../schema/Schema'
import { GraphQLObjectType, GraphQLSchema, printSchema } from 'graphql'
import { GraphQLSchema as WibeGraphQLSchema } from '../graphql'
import type { AuthenticationConfig } from '../authentication/interface'
import { type WibeRoute, defaultRoutes } from './routes'
import { type Hook, getDefaultHooks } from '../hooks'
import { generateCodegen } from './generateCodegen'
import { defaultAuthenticationMethods } from '../authentication/defaultAuthentication'
import { Wobe } from 'wobe'
import { WobeGraphqlYogaPlugin } from 'wobe-graphql-yoga'
import { Session } from '../authentication/Session'
import { getCookieInRequestHeaders } from '../utils'
import type { Context } from './interface'
import { initializeRoles } from '../authentication/roles'
import type { FileConfig } from '../files'
import { fileDevAdapter } from '../files/devAdapter'

export interface WibeConfig<T extends WibeAppTypes> {
	port: number
	schema: SchemaInterface<T>
	database: DatabaseConfig
	codegen?:
		| {
				enabled: true
				path: string
		  }
		| { enabled?: false }
	authentication?: AuthenticationConfig<T>
	routes?: WibeRoute[]
	rootKey: string
	hooks?: Hook<any>[]
	file?: FileConfig
}

export type WibeAppTypes = {
	types: Record<any, any>
	scalars: string
	enums: string
}

export class WibeApp<T extends WibeAppTypes> {
	public server: Wobe

	public config: WibeConfig<T>
	public databaseController: DatabaseController<T>

	constructor({
		port,
		schema,
		database,
		authentication,
		rootKey,
		codegen,
		hooks,
		file,
	}: WibeConfig<T>) {
		this.config = {
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

		this.databaseController = new DatabaseController<T>(databaseAdapter)

		this.loadDefaultRoutes()
		this.loadHooks()
		this.loadAuthenticationMethods()
	}

	loadAuthenticationMethods() {
		this.config.authentication = {
			...this.config.authentication,
			customAuthenticationMethods: [
				...defaultAuthenticationMethods<T>(),
				...(this.config.authentication?.customAuthenticationMethods ||
					[]),
			],
		}
	}

	loadHooks() {
		this.config.hooks = [...getDefaultHooks(), ...(this.config.hooks || [])]
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
		if (this.config.rootKey.length < 64)
			throw new Error(
				'Root key need to be greater or equal than 64 characters',
			)

		await this.databaseController.connect()

		const wibeSchema = new Schema(this.config)

		this.config.schema = wibeSchema.schema

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
				context: async ({ request }): Promise<Context<T>> => {
					const headers = request.headers

					if (headers.get('Wibe-Root-Key') === this.config.rootKey)
						return {
							isRoot: true,
							databaseController: this.databaseController,
							config: this.config,
						}

					const getAccessToken = () => {
						const isCookieSession =
							!!this.config.authentication?.session?.cookieSession

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
							databaseController: this.databaseController,
							config: this.config,
						}

					const session = new Session()

					const { user, sessionId } = await session.meFromAccessToken(
						accessToken,
						{
							isRoot: true,
							databaseController: this.databaseController,
							config: this.config,
						},
					)

					return {
						isRoot: false,
						sessionId,
						user,
						databaseController: this.databaseController,
						config: this.config,
					}
				},
				graphqlMiddleware: async (resolve, res) => {
					const response = await resolve()

					if (this.config.authentication?.session?.cookieSession) {
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
											session.getAccessTokenExpireIn(
												this.config,
											),
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
											session.getRefreshTokenExpireIn(
												this.config,
											),
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
			this.config.codegen
		) {
			if (this.config.codegen.enabled && this.config.codegen.path) {
				const fileContent = await Bun.file(
					`${this.config.codegen.path}/wibe.ts`,
				).text()

				generateCodegen({
					fileContent,
					graphqlSchema: printSchema(schema),
					path: this.config.codegen.path,
					schema: wibeSchema.schema,
				})
			}
		}

		await initializeRoles(this.databaseController, this.config)

		this.server.listen(this.config.port, ({ port }) => {
			if (!process.env.TEST)
				console.log(`Server is running on port ${port}`)
		})
	}

	async close() {
		await this.databaseController.close()
		this.server.stop()
	}
}
