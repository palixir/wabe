import { Elysia } from 'elysia'
import { apollo } from '@elysiajs/apollo'
import { DatabaseConfig } from '../database'
import { DatabaseController } from '../database/controllers/DatabaseController'
import { MongoAdapter } from '../database/adapters/MongoAdapter'
import { Schema, SchemaInterface } from '../schema/Schema'
import { GraphQLObjectType, GraphQLSchema } from 'graphql'
import { WibeGraphlQLSchema } from '../schema/WibeGraphQLSchema'
import { AuthenticationConfig } from '../authentication/interface'

interface WibeConfig {
	port: number
	schema: SchemaInterface
	database: DatabaseConfig
	codegen?: boolean
	authentication?: AuthenticationConfig
}

export class WibeApp {
	private server: Elysia

	static config: WibeConfig
	static databaseController: DatabaseController

	constructor({ port, schema, database, codegen = true }: WibeConfig) {
		WibeApp.config = { port, schema, database, codegen }

		this.server = new Elysia().get('/health', (context) => {
			context.set.status = 200
		})

		const databaseAdapter = new MongoAdapter({
			databaseName: database.name,
			databaseUrl: database.url,
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
			types: [...types.scalars, ...types.enums, ...types.objects],
		})

		this.server.use(
			await apollo({
				schema,
			}),
		)

		if (
			process.env.NODE_ENV !== 'production' &&
			process.env.NODE_ENV !== 'test' &&
			WibeApp.config.codegen
		) {
			// Generate Wibe types
			const wibeTypes = wibeSchema.getTypesFromSchema()

			Bun.write('generated/wibe.ts', wibeTypes)
		}

		/// FOR TESTING

		this.server.get('/auth/test', async (context) => {
			const code = context.query.code
			const client_id =
				'296431040556-4jh84e5s264rmrgnh8bmegb0kl550teg.apps.googleusercontent.com'
			const client_secret = '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'

			if (!code || !client_id) throw new Error('Invalid params')

			const res = await fetch('https://oauth2.googleapis.com/token', {
				method: 'POST',
				body: JSON.stringify({
					code,
					client_id,
					client_secret,
					grant_type: 'authorization_code',
					redirect_uri: 'http://localhost:3000/auth/test',
				}),
				headers: {
					'Content-Type': 'application/json',
				},
			})

			const { access_token, id_token } = await res.json()

			const user = await fetch(
				`https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${access_token}`,
				{
					headers: {
						Authorization: `Bearer ${id_token}`,
					},
				},
			)

			const userJson = await user.json()

			// Check if the email is verified
			// Update the user in the database

			// Create cookie for access and refresh token
			context.cookie.access_token.add({
				value: access_token,
				httpOnly: true,
				path: '/',
				expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
			})

			// Same with refresh token

			// If success redirect to the success login page
			// if failed redirect to the failed login page
			context.set.redirect = 'http://localhost:5173'
		})

		///

		this.server.listen(WibeApp.config.port, () => {
			console.log(`Server running on port ${WibeApp.config.port}`)
		})
	}

	async close() {
		await WibeApp.databaseController.close()
		await this.server.stop()
	}
}
