import type { DatabaseConfig } from '../database'
import { DatabaseController } from '../database/controllers/DatabaseController'
import { MongoAdapter } from '../database/adapters/MongoAdapter'
import { Schema, type SchemaInterface } from '../schema/Schema'
import { GraphQLObjectType, GraphQLSchema } from 'graphql'
import { GraphQLSchema as WabeGraphQLSchema } from '../graphql'
import type { AuthenticationConfig } from '../authentication/interface'
import { type WabeRoute, defaultRoutes } from './routes'
import { type Hook, getDefaultHooks } from '../hooks'
import { generateCodegen } from './generateCodegen'
import { defaultAuthenticationMethods } from '../authentication/defaultAuthentication'
import { Wobe, cors } from 'wobe'
import { WobeGraphqlYogaPlugin } from 'wobe-graphql-yoga'
import { Session } from '../authentication/Session'
import { getCookieInRequestHeaders } from '../utils'
import type { WabeContext } from './interface'
import { initializeRoles } from '../authentication/roles'
import type { FileConfig } from '../files'
import { fileDevAdapter } from '../files/devAdapter'

export interface WabeConfig<T extends WabeTypes> {
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
	routes?: WabeRoute[]
	rootKey: string
	hooks?: Hook<any>[]
	file?: FileConfig
}

export type WabeTypes = {
	types: Record<any, any>
	scalars: string
	enums: string
}

export type WobeCustomContext<T extends WabeTypes> = {
	wabe: WabeContext<T>
}

export class Wabe<T extends WabeTypes> {
	public server: Wobe<WobeCustomContext<T>>

	public config: WabeConfig<T>
	public controllers: {
		database: DatabaseController<T>
	}

	constructor({
		port,
		schema,
		database,
		authentication,
		rootKey,
		codegen,
		hooks,
		file,
	}: WabeConfig<T>) {
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

		this.server = new Wobe<WobeCustomContext<T>>().get(
			'/health',
			(context) => {
				context.res.status = 200
				context.res.send('OK')
			},
		)

		const databaseAdapter = new MongoAdapter({
			databaseName: database.name,
			databaseUrl: database.url,
		})

		this.controllers = {
			database: new DatabaseController<T>(databaseAdapter),
		}

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
		const wabeRoutes = defaultRoutes()

		wabeRoutes.map((route) => {
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
		await this.controllers.database.connect()

		const wabeSchema = new Schema(this.config)

		this.config.schema = wabeSchema.schema

		const graphqlSchema = new WabeGraphQLSchema(wabeSchema)

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

		if (
			process.env.NODE_ENV !== 'production' &&
			process.env.NODE_ENV !== 'test' &&
			this.config.codegen &&
			this.config.codegen.enabled &&
			this.config.codegen.path
		) {
			await generateCodegen({
				path: this.config.codegen.path,
				schema: wabeSchema.schema,
				graphqlSchema: schema,
			})

			// If we just want codegen we exit before server created.
			// Not the best solution but usefull to avoid multiple source of truth
			if (process.env.CODEGEN) process.exit(0)
		}

		this.server.options(
			'*',
			(ctx) => {
				return ctx.res.send('OK')
			},
			cors({
				origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
				allowHeaders: ['content-type'],
				credentials: true,
			}),
		)

		// Set the wabe context
		this.server.beforeHandler(async (ctx) => {
			const headers = ctx.request.headers

			if (headers.get('Wabe-Root-Key') === this.config.rootKey) {
				ctx.wabe = {
					isRoot: true,
					wabe: this,
				}
				return
			}

			const getAccessToken = () => {
				const isCookieSession =
					!!this.config.authentication?.session?.cookieSession

				if (isCookieSession)
					return getCookieInRequestHeaders(
						'accessToken',
						ctx.request.headers,
					)

				return headers.get('Wabe-Access-Token')
			}

			const accessToken = getAccessToken()

			if (!accessToken) {
				ctx.wabe = {
					isRoot: false,
					wabe: this,
				}
				return
			}

			const session = new Session()

			const { user, sessionId } = await session.meFromAccessToken(
				accessToken,
				{
					isRoot: true,
					wabe: this,
				},
			)

			ctx.wabe = {
				isRoot: false,
				sessionId,
				user,
				wabe: this,
			}
		})

		this.server.usePlugin(
			WobeGraphqlYogaPlugin({
				schema,
				maskedErrors: false,
				cors: {
					origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
					credentials: true,
					allowedHeaders: ['content-type'],
				},
				graphqlEndpoint: '/graphql',
				context: async (ctx): Promise<WabeContext<T>> => ctx.wabe,
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
									expires: session.getAccessTokenExpireAt(
										this.config,
									),
									secure:
										process.env.NODE_ENV === 'production',
								})

							if (refreshToken !== newRefreshToken)
								res.setCookie('refreshToken', newRefreshToken, {
									httpOnly: true,
									path: '/',
									expires: session.getRefreshTokenExpireAt(
										this.config,
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

		await initializeRoles(this)

		this.server.listen(this.config.port, ({ port }) => {
			if (!process.env.TEST)
				console.log(`Server is running on port ${port}`)
		})
	}

	async close() {
		await this.controllers.database.close()
		this.server.stop()
	}
}

export { generateCodegen }
