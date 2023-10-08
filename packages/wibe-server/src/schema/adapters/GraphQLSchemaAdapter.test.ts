import { describe, it, beforeAll, expect } from 'bun:test'
import { GraphQLSchemaAdapter } from './GraphQLSchemaAdapter'
import { Schema } from '../Schema'
import { makeSchema } from 'nexus'

describe('GraphQLSchemaAdapter', () => {
	let schemas: Schema[] = []

	beforeAll(() => {
		schemas.push(
			new Schema({
				name: 'Collection 1',
				fields: {
					name: { type: 'String' },
					age: { type: 'Int' },
					testFloat: { type: 'Float' },
					valid: { type: 'Boolean' },
					stringArrayTest: { type: 'array', valueType: 'String' },
					numberArrayTest: { type: 'array', valueType: 'Int' },
					booleanArrayTest: { type: 'array', valueType: 'Boolean' },
				},
				databaseController: null as any,
			}),
		)
	})

	it('should create types graphql schema', () => {
		const graphqlSchemaAdapter = new GraphQLSchemaAdapter(schemas)
		const types = graphqlSchemaAdapter.createSchema()

		const graphqlSchema = makeSchema({ types })
		// @ts-ignore
		const fields = graphqlSchema.getType('Collection1')?._fields

		expect(types.length).toEqual(1)
		expect(types[0].name).toEqual('Collection1')
		expect(fields.name.type.toString()).toEqual('String')
		expect(fields.age.type.toString()).toEqual('Int')
		expect(fields.testFloat.type.toString()).toEqual('Float')
		expect(fields.valid.type.toString()).toEqual('Boolean')
		expect(fields.stringArrayTest.type.toString()).toEqual('[String]')
		expect(fields.numberArrayTest.type.toString()).toEqual('[Int]')
		expect(fields.booleanArrayTest.type.toString()).toEqual('[Boolean]')
	})
})
