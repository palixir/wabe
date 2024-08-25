import { GraphQLSchema, GraphQLObjectType } from 'graphql'
import { devSchema } from './schema'
import { GraphQLSchema as WabeGraphQLSchema } from '../src/graphql'
import { generateCodegen } from '../src/server/generateCodegen'
import { Schema } from '../src/schema/Schema'

const run = async () => {
	// @ts-expect-error
	const wabeSchema = new Schema({ schema: devSchema })

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
		schema: devSchema,
		graphqlSchema: schema,
	})
}

await run()
