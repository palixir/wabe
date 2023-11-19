import { describe, expect, it, spyOn } from 'bun:test'
import { SchemaRouterController } from './SchemaRouterController'
import { GraphQLSchemaAdapter } from '../adapters/GraphQLSchemaAdapter'
import { DatabaseController } from '../../database/controllers/DatabaseController'
import { MongoAdapter } from '../../database/adapters/MongoAdapter'

describe('SchemaRouterController', () => {
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
