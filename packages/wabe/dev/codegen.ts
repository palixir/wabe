import { GraphQLSchema, GraphQLObjectType } from 'graphql'
import { devConfig } from './config'
import { GraphQLSchema as WabeGraphQLSchema } from '../src/graphql'
import { generateCodegen } from '../src/server/generateCodegen'
import { Schema } from '../src/schema/Schema'

const run = async () => {
	const wabeSchema = new Schema(devConfig)

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

	generateCodegen({
		path: `${import.meta.dirname}/../generated`,
		schema: devConfig.schema,
		graphqlSchema: schema,
	})

	process.exit(0)
}

run().catch((error) => console.error(error))
