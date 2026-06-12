import type { DatabaseConfig } from '../database'
import { DatabaseController } from '../database/DatabaseController'
import { type EnumInterface, Schema, type SchemaInterface } from '../schema/Schema'
import { GraphQLObjectType, GraphQLSchema, NoSchemaIntrospectionCustomRule } from 'graphql'
import { GraphQLSchema as WabeGraphQLSchema } from '../graphql'
import type { AuthenticationConfig } from '../authentication/interface'
import { type WabeRoute, defaultRoutes } from './routes'
import { type Hook, getDefaultHooks } from '../hooks'
import { defaultAuthenticationMethods } from '../authentication/defaultAuthentication'
import { Wobe, cors, rateLimit, secureHeaders, bodyLimit } from 'wobe'
import type { Context, CorsOptions, RateLimitOptions } from 'wobe'
import type { WabeContext } from './interface'
import { initializeRoles } from '../authentication/roles'
import type { EmailConfig } from '../email'
import { EmailController } from '../email/EmailController'
import { FileController } from '../file/FileController'
import { MutexController } from '../mutex/MutexController'
import { defaultSessionHandler } from './defaultSessionHandler'
import type { CronConfig } from '../cron'
import type { FileConfig } from '../file'
import { WobeGraphqlYogaPlugin } from 'wobe-graphql-yoga'
import { generateCodegen } from './generateCodegen'

type SecurityConfig = {
	corsOptions?: CorsOptions
	rateLimit?: RateLimitOptions
	hideSensitiveErrorMessage?: boolean
	disableCSRFProtection?: boolean
	disableGraphQLDashboard?: boolean
	disableIntrospection?: boolean
	maxGraphqlDepth?: number
	/**
	 * Maximum recursion depth for where clauses with AND/OR and Pointer/Relation subqueries.
	 * Prevents DoS via deeply nested queries. Default: 10.
	 */
	maxWhereRecursionDepth?: number
	/**
	 * Default number of objects returned by list queries when the client does not provide `first`.
	 * Prevents unbounded reads (DoS / memory exhaustion). Default: 100.
	 */
	defaultPaginationLimit?: number
	/**
	 * Maximum number of objects a list query is allowed to return. Any `first` greater than this
	 * value is clamped down to it. Prevents unbounded reads (DoS / memory exhaustion). Default: 1000.
	 */
	maxPaginationLimit?: number
	/**
	 * Maximum allowed request body size in bytes (rejected with 413 when exceeded). When omitted, no
	 * body-size limit is enforced. Prevents large-payload DoS.
	 */
	maxRequestSizeBytes?: number
}

/**
 * Validates CORS options to prevent the dangerous combination of `credentials: true` with a wildcard
 * origin (`*`), which browsers forbid and which would expose authenticated responses to any site.
 */
export const getSafeCorsOptions = (corsOptions?: CorsOptions): CorsOptions | undefined => {
	if (!corsOptions || !corsOptions.credentials) return corsOptions

	const origin = (corsOptions as { origin?: unknown }).origin

	const isWildcard =
		origin === undefined ||
		origin === '*' ||
		(Array.isArray(origin) && origin.some((value) => value === '*'))

	if (isWildcard)
		throw new Error(
			'Insecure CORS configuration: `credentials: true` cannot be combined with a wildcard origin ("*"). Specify explicit allowed origins.',
		)

	return corsOptions
}

export * from './interface'
export * from './routes'

export const defaultRoles = ['DashboardAdmin']

export type GenerateCodegenContext<T extends WabeTypes> = {
	path: string
	schema: SchemaInterface<T>
	graphqlSchema: GraphQLSchema
	isProduction: boolean
	nodeEnv: string | undefined
}

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
	onGenerateCodegen?: (context: GenerateCodegenContext<T>) => Promise<void> | void
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
	mutex: MutexController<T>
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
		onGenerateCodegen,
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
			onGenerateCodegen,
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

		const databaseController = new DatabaseController<T>(database.adapter)

		this.controllers = {
			database: databaseController,
			mutex: new MutexController<T>(databaseController, this),
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
				devDirectory: this.config.file?.devDirectory || `${process.cwd()}/bucket`,
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

	_assertSecureProductionConfig() {
		if (!this.config.isProduction) return
		// The integration test suite intentionally runs in production mode with development secrets.
		if (process.env.NODE_ENV === 'test') return

		const insecureSecrets = new Set(['dev', 'test', 'secret', 'changeme', ''])

		if (insecureSecrets.has(this.config.rootKey))
			throw new Error(
				'Insecure configuration: `rootKey` must not use a development/default value in production',
			)

		const jwtSecret = this.config.authentication?.session?.jwtSecret
		if (jwtSecret && insecureSecrets.has(jwtSecret))
			throw new Error(
				'Insecure configuration: `jwtSecret` must not use a development/default value in production',
			)

		const emailAdapterName = this.config.email?.adapter?.constructor?.name
		if (emailAdapterName === 'EmailDevAdapter')
			throw new Error('Insecure configuration: `EmailDevAdapter` must not be used in production')
	}

	async start() {
		if (!this.config.rootKey || this.config.rootKey.length === 0)
			throw new Error('rootKey cannot be empty')

		if (this.config.authentication?.session && !this.config.authentication.session.jwtSecret)
			throw new Error('Authentication session requires jwt secret')

		this._assertSecureProductionConfig()

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

			await this.config.onGenerateCodegen?.({
				path: this.config.codegen.path,
				schema: wabeSchema.schema,
				graphqlSchema: this.config.graphqlSchema,
				isProduction: this.config.isProduction,
				nodeEnv: process.env.NODE_ENV,
			})

			// If we just want codegen we exit before server created.
			// Not the best solution but useful to avoid multiple source of truth
			if (process.env.CODEGEN) process.exit(0)
		}

		const safeCorsOptions = getSafeCorsOptions(this.config.security?.corsOptions)

		this.server.options(
			'/*',
			(ctx) => {
				return ctx.res.send('OK')
			},
			cors(safeCorsOptions),
		)

		// Defense-in-depth security headers (X-Frame-Options, nosniff, referrer-policy, HSTS, ...).
		this.server.beforeHandler(secureHeaders({}))

		const maxRequestSizeBytes = this.config.security?.maxRequestSizeBytes
		if (maxRequestSizeBytes) this.server.beforeHandler(bodyLimit({ maxSize: maxRequestSizeBytes }))

		const rateLimitOptions =
			this.config.security?.rateLimit ||
			(this.config.isProduction
				? {
						numberOfRequests: 200,
						interval: 60_000,
					}
				: undefined)

		if (rateLimitOptions) this.server.beforeHandler(rateLimit(rateLimitOptions))

		this.server.beforeHandler(cors(safeCorsOptions))

		// Set the wabe context
		this.server.beforeHandler(
			// @ts-expect-error
			this.config.authentication?.sessionHandler ||
				// @ts-expect-error
				defaultSessionHandler(this),
		)

		const maxDepth = this.config.security?.maxGraphqlDepth ?? (this.config.isProduction ? 15 : 50)
		const introspectionDisabled =
			this.config.security?.disableIntrospection ?? this.config.isProduction
		const disableGraphQLDashboard =
			this.config.security?.disableGraphQLDashboard ?? this.config.isProduction

		await this.server.usePlugin(
			WobeGraphqlYogaPlugin({
				schema: this.config.graphqlSchema,
				allowGetRequests: !disableGraphQLDashboard,
				maskedErrors: this.config.security?.hideSensitiveErrorMessage || this.config.isProduction,
				allowIntrospection: !introspectionDisabled,
				maxDepth,
				// Disable GraphQL operation batching in production to limit query-cost amplification/DoS.
				allowMultipleOperations: !this.config.isProduction,
				graphqlEndpoint: '/graphql',
				plugins: [
					(() => {
						const introspectionDisabledRequests = new WeakSet<Request>()
						return {
							onRequestParse: ({ request }: { request: Request }) => {
								if (!introspectionDisabled) return
								introspectionDisabledRequests.add(request)
							},
							onValidate: ({
								addValidationRule,
								context,
							}: {
								addValidationRule: (rule: unknown) => void
								context: { request: Request }
							}) => {
								if (introspectionDisabledRequests.has(context.request)) {
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
		this.config.crons?.forEach(({ job }) => {
			// Croner jobs expose stop() when active.
			job?.stop?.()
		})
		await this.controllers.database.close()
		await this.server.stop()
	}
}
