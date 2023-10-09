import { describe, expect, it, spyOn } from 'bun:test'
import { SchemaRouterController } from './SchemaRouterController'
import { GraphQLSchemaAdapter } from '../adapters'

describe('SchemaRouterController', () => {
	it('should call the good adapter on create schema', () => {
		const spyAdapterCreateSchema = spyOn(
			GraphQLSchemaAdapter.prototype,
			'createSchema',
		)

		const graphqlSchemaAdapter = new GraphQLSchemaAdapter([])
		const schemaRouterController = new SchemaRouterController(
			graphqlSchemaAdapter,
		)

		schemaRouterController.createSchema()

		expect(spyAdapterCreateSchema).toHaveBeenCalledTimes(1)
	})
})
