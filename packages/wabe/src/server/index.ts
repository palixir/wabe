import type { DatabaseConfig } from '../database'
import { DatabaseController } from '../database/controllers/DatabaseController'
import { MongoAdapter } from '../database/adapters/MongoAdapter'
import {
  type EnumInterface,
  Schema,
  type SchemaInterface,
} from '../schema/Schema'
import { GraphQLObjectType, GraphQLSchema } from 'graphql'
import { GraphQLSchema as WabeGraphQLSchema } from '../graphql'
import type { AuthenticationConfig } from '../authentication/interface'
import { type WabeRoute, defaultRoutes } from './routes'
import { type Hook, getDefaultHooks } from '../hooks'
import { generateCodegen } from './generateCodegen'
import { defaultAuthenticationMethods } from '../authentication/defaultAuthentication'
import { Wobe, cors, rateLimit } from 'wobe'
import { WobeGraphqlYogaPlugin } from 'wobe-graphql-yoga'
import type { CorsOptions, RateLimitOptions } from 'wobe'
import { Session } from '../authentication/Session'
import { getCookieInRequestHeaders } from '../utils'
import type { WabeContext } from './interface'
import { initializeRoles } from '../authentication/roles'
import type { FileConfig } from '../files'
import { fileDevAdapter } from '../files/devAdapter'
import type { EmailConfig } from '../email'
import { EmailController } from '../email/EmailController'
import type { PaymentConfig } from '../payment/interface'
import { PaymentController } from '../payment/PaymentController'

type SecurityConfig = {
  corsOptions?: CorsOptions
  rateLimit?: RateLimitOptions
}

export interface WabeConfig<T extends WabeTypes> {
  port: number
  hostname?: string
  security?: SecurityConfig
  schema?: SchemaInterface<T>
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
  hooks?: Hook<T, any>[]
  email?: EmailConfig
  payment?: PaymentConfig
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

type WabeControllers<T extends WabeTypes> = {
  database: DatabaseController<T>
  email?: EmailController
  payment?: PaymentController
}

export class Wabe<T extends WabeTypes> {
  public server: Wobe<WobeCustomContext<T>>

  public config: WabeConfig<T>
  public controllers: WabeControllers<T>

  constructor({
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
    payment,
    routes,
  }: WabeConfig<T>) {
    this.config = {
      port,
      hostname,
      security,
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
      email,
      payment,
      routes,
    }

    this.server = new Wobe<WobeCustomContext<T>>({ hostname }).get(
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
      email: email?.adapter ? new EmailController(email.adapter) : undefined,
      payment: payment?.adapter ? new PaymentController(payment) : undefined,
    }

    this.loadRoleEnum()
    this.loadRoutes()
    this.loadHooks()
    this.loadAuthenticationMethods()
  }

  loadRoleEnum() {
    const roles = this.config.authentication?.roles || []

    if (roles.length === 0) return

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
    // @ts-expect-error
    const wabeRoutes = [...defaultRoutes(this), ...(this.config.routes || [])]

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
    this.server.beforeHandler(async (ctx) => {
      const headers = ctx.request.headers

      if (headers.get('Wabe-Root-Key') === this.config.rootKey) {
        ctx.wabe = {
          isRoot: true,
          wabe: this,
          response: ctx.res,
        }
        return
      }

      const getAccessToken = () => {
        if (headers.get('Wabe-Access-Token'))
          return { accessToken: headers.get('Wabe-Access-Token') }

        const isCookieSession =
          !!this.config.authentication?.session?.cookieSession

        if (isCookieSession)
          return {
            accessToken: getCookieInRequestHeaders(
              'accessToken',
              ctx.request.headers,
            ),
          }

        return { accessToken: null }
      }

      const { accessToken } = getAccessToken()

      if (!accessToken) {
        ctx.wabe = {
          isRoot: false,
          wabe: this,
          response: ctx.res,
        }
        return
      }

      const session = new Session()

      const { user, sessionId } = await session.meFromAccessToken(accessToken, {
        isRoot: true,
        wabe: this,
      })

      ctx.wabe = {
        isRoot: false,
        sessionId,
        user,
        wabe: this,
        response: ctx.res,
      }
    })

    this.server.usePlugin(
      WobeGraphqlYogaPlugin({
        schema,
        maskedErrors: false,
        graphqlEndpoint: '/graphql',
        context: async (ctx): Promise<WabeContext<T>> => ctx.wabe,
        graphqlMiddleware: async (resolve, res) => {
          const response = await resolve()

          try {
            if (this.config.authentication?.session?.cookieSession) {
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
                } = await session.refresh(accessToken, refreshToken, {
                  wabe: this,
                  isRoot: true,
                })

                if (!newAccessToken || !newRefreshToken) return response

                if (accessToken !== newAccessToken)
                  res.setCookie('accessToken', newAccessToken, {
                    httpOnly: true,
                    path: '/',
                    expires: session.getAccessTokenExpireAt(this.config),
                    sameSite: 'None',
                    secure: true,
                  })

                if (refreshToken !== newRefreshToken)
                  res.setCookie('refreshToken', newRefreshToken, {
                    httpOnly: true,
                    path: '/',
                    expires: session.getRefreshTokenExpireAt(this.config),
                    sameSite: 'None',
                    secure: true,
                  })
              }
            }
          } catch {
            return response
          }

          return response
        },
      }),
    )

    // @ts-expect-error
    await Promise.all([initializeRoles(this)])

    this.server.listen(this.config.port, ({ port }) => {
      if (!process.env.TEST) console.log(`Server is running on port ${port}`)
    })
  }

  async close() {
    await this.controllers.database.close()
    this.server.stop()
  }
}

export { generateCodegen }
