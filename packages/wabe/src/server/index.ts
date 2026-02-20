import type { DatabaseConfig } from '../database'
import { DatabaseController } from '../database/DatabaseController'
import { type EnumInterface, Schema, type SchemaInterface } from '../schema/Schema'
import { GraphQLObjectType, GraphQLSchema, NoSchemaIntrospectionCustomRule } from 'graphql'
import { GraphQLSchema as WabeGraphQLSchema } from '../graphql'
import type { AuthenticationConfig } from '../authentication/interface'
import { type WabeRoute, defaultRoutes } from './routes'
import { type Hook, getDefaultHooks } from '../hooks'
import { generateCodegen } from './generateCodegen'
import { defaultAuthenticationMethods } from '../authentication/defaultAuthentication'
import { Wobe, cors, rateLimit } from 'wobe'
import type { Context, CorsOptions, RateLimitOptions } from 'wobe'
import type { WabeContext } from './interface'
import { initializeRoles } from '../authentication/roles'
import type { EmailConfig } from '../email'
import { EmailController } from '../email/EmailController'
import { FileController } from '../file/FileController'
import { defaultSessionHandler } from './defaultSessionHandler'
import type { CronConfig } from '../cron'
import type { FileConfig } from '../file'
import { isValidRootKey } from '../utils'
import { WobeGraphqlYogaPlugin } from 'wobe-graphql-yoga'

type SecurityConfig = {
	corsOptions?: CorsOptions
	rateLimit?: RateLimitOptions
	hideSensitiveErrorMessage?: boolean
	disableCSRFProtection?: boolean
	allowIntrospectionInProduction?: boolean
	maxGraphqlDepth?: number
}

export * from './interface'
export * from './routes'

export const defaultRoles = ['DashboardAdmin']

export interface WabeConfig<T extends WabeTypes> {
	port: number
	isProduction: boolean
	hostname?: string
	security?: SecurityConfig
	schema?: SchemaInterface<T>
	graphqlSchema?: GraphQLSchema
	database: DatabaseConfig<T>
	codegen?:
		| {
				enabled: true
				path: string
		  }
		| { enabled?: false }
	authentication?: AuthenticationConfig<T>
	routes?: WabeRoute[]
	rootKey: string
	hooks?: Hook<T, any>[]
	email?: EmailConfig
	file?: FileConfig<T>
	crons?: CronConfig<T>
}

export type WabeTypes = {
	types: Record<any, any>
	where: Record<any, any>
	scalars: string
	enums: Record<any, any>
}

export type WobeCustomContext<T extends WabeTypes> = Context & {
	wabe: WabeContext<T>
}

type WabeControllers<T extends WabeTypes> = {
	database: DatabaseController<T>
	email?: EmailController
	file?: FileController
}

export class Wabe<T extends WabeTypes> {
	public server: Wobe<WobeCustomContext<T>>

	public config: WabeConfig<T>
	public controllers: WabeControllers<T>

	constructor({
		isProduction,
		port,
		hostname,
		security,
		schema,
		database,
		authentication,
		rootKey,
		codegen,
		hooks,
		file,
		email,
		routes,
		crons,
	}: WabeConfig<T>) {
		this.config = {
			isProduction,
			port,
			hostname,
			security,
			schema,
			database,
			codegen,
			authentication,
			rootKey,
			hooks,
			email,
			routes,
			file,
			crons,
		}

		this.server = new Wobe<WobeCustomContext<T>>({ hostname }).get('/health', (context) => {
			context.res.status = 200
			context.res.send('OK')
		})

		this.controllers = {
			database: new DatabaseController<T>(database.adapter),
			email: email?.adapter ? new EmailController(email.adapter) : undefined,
			file: file?.adapter ? new FileController(file.adapter, this) : undefined,
		}

		this.loadCrons()
		this.loadAuthenticationMethods()
		this.loadRoleEnum()
		this.loadRoutes()
		this.loadHooks()
	}

	loadCrons() {
		if (!this.config.crons) return

		const crons = this.config.crons.map((cron) => ({
			...cron,
			job: cron.cron(this),
		}))

		this.config.crons = crons
	}

	loadRoleEnum() {
		const roles = [...defaultRoles, ...(this.config.authentication?.roles || [])]

		const roleEnum: EnumInterface = {
			name: 'RoleEnum',
			values: roles.reduce(
				(acc, currentRole) => {
					acc[currentRole] = currentRole
					return acc
				},
				{} as Record<string, any>,
			),
		}

		this.config.schema = {
			...this.config.schema,
			enums: [...(this.config.schema?.enums || []), roleEnum],
		}
	}

	loadAuthenticationMethods() {
		this.config.authentication = {
			...this.config.authentication,
			customAuthenticationMethods: [
				...defaultAuthenticationMethods<T>(),
				...(this.config.authentication?.customAuthenticationMethods || []),
			],
		}
	}

	loadHooks() {
		if (this.config.hooks?.find((hook) => hook.priority <= 0))
			throw new Error('Hook priority <= 0 is reserved for internal uses')

		this.config.hooks = [...getDefaultHooks(), ...(this.config.hooks || [])]
	}

	loadRoutes() {
		const enableBucketRoute = !this.config.isProduction

		const wabeRoutes = [
			...defaultRoutes({
				devDirectory: this.config.file?.devDirectory || `${__dirname}/../../bucket`,
				enableBucketRoute,
			}),
			...(this.config.routes || []),
		]

		wabeRoutes.forEach((route) => {
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
		if (!this.config.rootKey || this.config.rootKey.length === 0)
			throw new Error('rootKey cannot be empty')

		if (this.config.authentication?.session && !this.config.authentication.session.jwtSecret)
			throw new Error('Authentication session requires jwt secret')

		const wabeSchema = new Schema(this.config)

		this.config.schema = wabeSchema.schema

		await this.controllers.database.initializeDatabase(wabeSchema.schema)

		const graphqlSchema = new WabeGraphQLSchema(wabeSchema)

		const types = graphqlSchema.createSchema()

		this.config.graphqlSchema = new GraphQLSchema({
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
			!this.config.isProduction &&
			process.env.NODE_ENV !== 'test' &&
			this.config.codegen &&
			this.config.codegen.enabled &&
			this.config.codegen.path.length > 0
		) {
			await generateCodegen({
				path: this.config.codegen.path,
				schema: wabeSchema.schema,
				graphqlSchema: this.config.graphqlSchema,
			})

			// If we just want codegen we exit before server created.
			// Not the best solution but useful to avoid multiple source of truth
			if (process.env.CODEGEN) process.exit(0)
		}

		this.server.options(
			'/*',
			(ctx) => {
				return ctx.res.send('OK')
			},
			cors(this.config.security?.corsOptions),
		)

		const rateLimitOptions = this.config.security?.rateLimit

		if (rateLimitOptions) this.server.beforeHandler(rateLimit(rateLimitOptions))

		this.server.beforeHandler(cors(this.config.security?.corsOptions))

		// Set the wabe context
		this.server.beforeHandler(
			// @ts-expect-error
			this.config.authentication?.sessionHandler ||
				// @ts-expect-error
				defaultSessionHandler(this),
		)

		const maxDepth = this.config.security?.maxGraphqlDepth ?? 50

		await this.server.usePlugin(
			WobeGraphqlYogaPlugin({
				schema: this.config.graphqlSchema,
				maskedErrors: this.config.security?.hideSensitiveErrorMessage || this.config.isProduction,
				allowIntrospection: !!this.config.security?.allowIntrospectionInProduction,
				maxDepth,
				allowMultipleOperations: true,
				graphqlEndpoint: '/graphql',
				plugins: [
					(() => {
						const introspectionDisabled = new WeakSet<Request>()
						return {
							onRequestParse: ({ request }: { request: Request }) => {
								if (this.config.security?.allowIntrospectionInProduction) return
								if (isValidRootKey(request.headers, this.config.rootKey)) return
								introspectionDisabled.add(request)
							},
							onValidate: ({
								addValidationRule,
								context,
							}: {
								addValidationRule: (rule: unknown) => void
								context: { request: Request }
							}) => {
								if (introspectionDisabled.has(context.request)) {
									addValidationRule(NoSchemaIntrospectionCustomRule)
								}
							},
						}
					})(),
				],
				context: async (ctx): Promise<WabeContext<T>> => ctx.wabe,
			}),
		)

		this.server.listen(this.config.port, ({ port }) => {
			if (!process.env.TEST) console.log(`Server is running on port ${port}`)
		})

		// @ts-expect-error
		await initializeRoles(this)
	}

	async close() {
		await this.controllers.database.close()
		await this.server.stop()
	}
}

export { generateCodegen }
