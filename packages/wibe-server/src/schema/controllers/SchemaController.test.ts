import { describe, expect, it, spyOn } from 'bun:test'
import { SchemaRouterController } from './SchemaController'
import { GraphQLSchemaAdapter } from '../adapters/GraphQLSchemaAdapter'

describe('SchemaController', () => {
	it('should call the good adapter on create schema', () => {
		const spyAdapterCreateSchema = spyOn(
			GraphQLSchemaAdapter.prototype,
			'createSchema',
		)

		const graphqlSchemaAdapter = new GraphQLSchemaAdapter([])
		const schemaRouterController = new SchemaRouterController({
			adapter: graphqlSchemaAdapter,
		})

		schemaRouterController.createSchema()

		expect(spyAdapterCreateSchema).toHaveBeenCalledTimes(1)
	})
})
