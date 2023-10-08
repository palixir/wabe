import { describe, it, beforeAll } from 'bun:test'
import { GraphQLSchemaAdapter } from './GraphQLSchemaAdapter'
import { Schema } from '../Schema'

describe('GraphQLSchemaAdapter', () => {
	let schemas: Schema[]

	beforeAll(() => {
		schemas[0] = new Schema({
			name: 'Collection 1',
			fields: { name: { type: 'String' }, age: { type: 'Int' } },
			databaseController: null as any,
		})
	})

	it('should create graphql schema', () => {
		const graphqlSchemaAdapter = new GraphQLSchemaAdapter(schemas)

		const types = graphqlSchemaAdapter.createSchema()

		console.log(types)
	})
})
