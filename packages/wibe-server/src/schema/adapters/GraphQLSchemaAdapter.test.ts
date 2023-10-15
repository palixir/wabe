import { describe, it, beforeAll, expect } from 'bun:test'
import { GraphQLSchemaAdapter } from './GraphQLSchemaAdapter'
import { Schema } from '../Schema'
import { makeSchema } from 'nexus'
import { NexusGraphQLSchema } from 'nexus/dist/core'

describe('GraphQLSchemaAdapter', () => {
	let schemas: Schema[] = []
	let graphqlSchema: NexusGraphQLSchema
	let types: any

	beforeAll(() => {
		schemas.push(
			new Schema({
				name: 'Use r',
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

		const graphqlSchemaAdapter = new GraphQLSchemaAdapter(schemas)
		types = graphqlSchemaAdapter.createSchema()

		graphqlSchema = makeSchema({ types })
	})

	it("should create input types from schema's fields", () => {
		console.log(graphqlSchema.getType('UserInput'))
	})

	it('should create types graphql schema', () => {
		// @ts-ignore
		const fields = graphqlSchema.getType('User').getFields()

		// Type Collection1, Query and Mutation
		expect(types.length).toEqual(3)
		expect(types[0].name).toEqual('User')
		expect(fields.name.type.toString()).toEqual('String')
		expect(fields.age.type.toString()).toEqual('Int')
		expect(fields.testFloat.type.toString()).toEqual('Float')
		expect(fields.valid.type.toString()).toEqual('Boolean')
		expect(fields.stringArrayTest.type.toString()).toEqual('[String]')
		expect(fields.numberArrayTest.type.toString()).toEqual('[Int]')
		expect(fields.booleanArrayTest.type.toString()).toEqual('[Boolean]')
	})

	it('should create queries graphql schema', () => {
		// @ts-ignore
		const fields = graphqlSchema.getType('Query').getFields()

		expect(fields['user'].type.toString()).toEqual('User')
		expect(fields['user'].args.length).toEqual(1)
		expect(fields['user'].args[0].name).toEqual('id')

		expect(fields['users'].type.toString()).toEqual('[User]')
		expect(fields['users'].args.length).toEqual(0)
	})

	it('should create mutations graphql schema', () => {
		// @ts-ignore
		const fields = graphqlSchema.getType('Mutation').getFields()

		expect(fields['createUser'].type.toString()).toEqual('User')
		expect(fields['createUser'].args.length).toEqual(1)
		expect(fields['createUser'].args[0].type.name).toEqual('UserInput')

		expect(fields['updateUser'].type.toString()).toEqual('User')
		expect(fields['updateUser'].args.length).toEqual(1)
		expect(fields['updateUser'].args[0].type.name).toEqual(
			'UpdateUserInput',
		)

		expect(fields['updateUsers'].type.toString()).toEqual('[User]')
		expect(fields['updateUsers'].args.length).toEqual(1)
		expect(fields['updateUsers'].args[0].type.name).toEqual(
			'UpdateUsersInput',
		)

		expect(fields['deleteUser'].type.toString()).toEqual('User')
		expect(fields['deleteUser'].args.length).toEqual(1)
		expect(fields['deleteUser'].args[0].type.name).toEqual(
			'DeleteUserInput',
		)

		expect(fields['deleteUsers'].type.toString()).toEqual('[User]')
		expect(fields['deleteUsers'].args.length).toEqual(1)
		expect(fields['deleteUsers'].args[0].type.name).toEqual(
			'DeleteUsersInput',
		)
	})
})
