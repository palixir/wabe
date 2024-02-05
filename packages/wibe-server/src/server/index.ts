import { Elysia } from 'elysia'
import { jwt } from '@elysiajs/jwt'
import { apollo } from '@elysiajs/apollo'
import { DatabaseConfig } from '../database'
import { DatabaseController } from '../database/controllers/DatabaseController'
import { MongoAdapter } from '../database/adapters/MongoAdapter'
import { Schema, SchemaInterface } from '../schema/Schema'
import { GraphQLObjectType, GraphQLSchema, printSchema } from 'graphql'
import { WibeGraphQLSchema } from '../schema/WibeGraphQLSchema'
import { AuthenticationConfig } from '../authentication/interface'
import { WibeRoute, defaultRoutes } from './routes'

interface WibeConfig {
    port: number
    schema: SchemaInterface
    database: DatabaseConfig
    codegen?: boolean
    authentication?: AuthenticationConfig
    routes?: WibeRoute[]
    wibeKey: string
}

export class WibeApp {
    private server: Elysia

    static config: WibeConfig
    static databaseController: DatabaseController

    constructor({
        port,
        schema,
        database,
        codegen = true,
        authentication,
        wibeKey,
    }: WibeConfig) {
        WibeApp.config = {
            port,
            schema,
            database,
            codegen,
            authentication,
            wibeKey,
        }

        this.server = new Elysia().get('/health', (context) => {
            context.set.status = 200
        })

        this.loadDefaultRoutes()

        const databaseAdapter = new MongoAdapter({
            databaseName: database.name,
            databaseUrl: database.url,
        })

        WibeApp.databaseController = new DatabaseController(databaseAdapter)
    }

    async loadDefaultRoutes() {
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

        this.server.use(
            jwt({
                name: 'jwt',
                secret: WibeApp.config.wibeKey,
            }),
        )

        this.server.use(
            await apollo({
                schema,
                context: async (context) => context,
            }),
        )

        if (
            process.env.NODE_ENV !== 'production' &&
            process.env.NODE_ENV !== 'test' &&
            WibeApp.config.codegen
        ) {
            // Scalars
            const listOfScalars =
                wibeSchema.schema.scalars?.map(
                    (scalar) => `"${scalar.name}"`,
                ) || []
            const wibeScalarType = `export type WibeSchemaScalars = ${listOfScalars.join(
                ' | ',
            )}`

            // Enums
            const wibeEnumsGlobalTypes =
                wibeSchema.schema.enums?.map(
                    (wibeEnum) => `"${wibeEnum.name}"`,
                ) || []

            const wibeEnumsGlobalTypesString = `export type WibeSchemaEnums = ${wibeEnumsGlobalTypes.join(
                ' | ',
            )}`

            // Types
            const allNames = wibeSchema.schema.class
                .map((schema) => `${schema.name}: ${schema.name}`)
                .filter((schema) => schema)

            const globalWibeTypeString = `export type WibeSchemaTypes = {\n\t${allNames.join(
                ',\n\t',
            )}\n}`

            const contentOfCodegenFile =
                await Bun.file('generated/wibe.ts').text()

            if (!contentOfCodegenFile.includes('WibeSchemaTypes'))
                Bun.write(
                    'generated/wibe.ts',
                    `${contentOfCodegenFile}\n\n${wibeScalarType}\n\n${wibeEnumsGlobalTypesString}\n\n${globalWibeTypeString}`,
                )
            Bun.write('generated/schema.graphql', printSchema(schema))
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
