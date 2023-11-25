import { describe, expect, it, spyOn } from 'bun:test'
import { WibeGraphlQLSchema } from './WibeGraphQLSchema'

describe('WibeGraphlQLSchema', () => {
	it('should call the good adapter on create schema', () => {
		const spyAdapterCreateSchema = spyOn(
			WibeGraphlQLSchema.prototype,
			'createSchema',
		)

		const schemaRouterController = new WibeGraphlQLSchema([])

		schemaRouterController.createSchema()

		// TODO
	})
})
