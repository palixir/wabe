import { describe, expect, it } from 'bun:test'
import { GraphqlParser } from './parser'
import {
	GraphQLNonNull,
	type GraphQLNullableType,
	GraphQLObjectType,
	GraphQLString,
} from 'graphql'

const deepCompareGraphQLObjects = (
	obj1: GraphQLNullableType,
	obj2: GraphQLNullableType,
): boolean => {
	// Check if both objects are instances of GraphQLObjectType or GraphQLNonNull
	if (
		(!(obj1 instanceof GraphQLObjectType) &&
			!(obj1 instanceof GraphQLNonNull)) ||
		(!(obj2 instanceof GraphQLObjectType) && !(obj2 instanceof GraphQLNonNull))
	)
		return false

	// Unwrap GraphQLNonNull if present
	const unwrappedObj1 = obj1 instanceof GraphQLNonNull ? obj1.ofType : obj1
	const unwrappedObj2 = obj2 instanceof GraphQLNonNull ? obj2.ofType : obj2

	// Compare type name
	if (unwrappedObj1.name !== unwrappedObj2.name) return false

	// Compare description
	if (unwrappedObj1.description !== unwrappedObj2.description) return false

	// If both objects are GraphQLNonNull, recursively compare the wrapped types
	if (obj1 instanceof GraphQLNonNull && obj2 instanceof GraphQLNonNull)
		return deepCompareGraphQLObjects(unwrappedObj1, unwrappedObj2)

	// If one object is GraphQLNonNull and the other is not, they are not equal
	if (obj1 instanceof GraphQLNonNull || obj2 instanceof GraphQLNonNull)
		return false

	// Compare fields if both objects are GraphQLObjectType
	const fields1 = (obj1 as GraphQLObjectType).getFields()
	const fields2 = (obj2 as GraphQLObjectType).getFields()

	if (Object.keys(fields1).length !== Object.keys(fields2).length) return false

	for (const fieldName in fields1) {
		if (!fields2[fieldName]) return false

		const field1 = fields1[fieldName]
		const field2 = fields2[fieldName]

		// Check field name
		if (field1?.name !== field2?.name) return false

		// Check field description
		if (field1?.description !== field2?.description) return false

		// Check field type
		if (field1?.type.toString() !== field2?.type.toString()) return false
	}

	return true
}

describe('WabeGraphqlParser', () => {
	it('should parse a wabe object', () => {
		const graphqlParser = GraphqlParser({
			enums: [],
			scalars: [],
		})
		const simpleObject = graphqlParser({
			graphqlObjectType: {} as any,
			schemaFields: {} as any,
			allObjects: {} as any,
		})._parseWabeObject({
			description: 'A simple object',
			required: true,
			objectToParse: {
				name: 'SimpleObject',
				fields: {
					name: { type: 'String', required: true },
				},
			},
			nameOfTheObject: 'SimpleObject',
		})

		const expectedObject = new GraphQLNonNull(
			new GraphQLObjectType({
				name: 'SimpleObject',
				description: 'A simple object',
				fields: {
					name: {
						type: new GraphQLNonNull(GraphQLString),
					},
				},
			}),
		)

		expect(deepCompareGraphQLObjects(simpleObject, expectedObject)).toEqual(
			true,
		)
	})

	it('should parse a recursive wabe object', () => {
		const graphqlParser = GraphqlParser({
			enums: [],
			scalars: [],
		})

		const recursiveObject = graphqlParser({
			graphqlObjectType: {} as any,
			schemaFields: {} as any,
			allObjects: {} as any,
		})._parseWabeObject({
			description: 'A recursive object',
			required: true,
			objectToParse: {
				name: 'RecursiveObject',
				fields: {
					subObject: {
						type: 'Object',
						object: {
							name: 'SubObject',
							fields: {
								name: { type: 'String', required: true },
							},
						},
					},
				},
			},
			nameOfTheObject: 'RecursiveObject',
		})

		const expectedObject = new GraphQLNonNull(
			new GraphQLObjectType({
				name: 'RecursiveObject',
				description: 'A recursive object',
				fields: {
					subObject: {
						type: new GraphQLObjectType({
							name: 'RecursiveObjectSubObject',
							fields: {
								name: {
									type: new GraphQLNonNull(GraphQLString),
								},
							},
						}),
					},
				},
			}),
		)

		expect(deepCompareGraphQLObjects(recursiveObject, expectedObject)).toEqual(
			true,
		)
	})

	it('should create an graphql object from simple object', () => {
		const graphqlParser = GraphqlParser({
			scalars: [],
			enums: [],
		})

		const simpleObject = graphqlParser({
			schemaFields: {
				name: { type: 'String', required: true },
			},
			graphqlObjectType: 'Object',
			allObjects: {},
		}).getGraphqlFields('SimpleObject')

		expect(simpleObject).toEqual({
			name: {
				type: new GraphQLNonNull(GraphQLString),
			},
		} as any)
	})

	it('should create an graphql object from recursive object', () => {
		const graphqlParser = GraphqlParser({
			scalars: [],
			enums: [],
		})

		const recursiveObject = graphqlParser({
			schemaFields: {
				subObject: {
					type: 'Object',
					object: {
						name: 'SubObject',
						fields: {
							name: { type: 'String', required: true },
						},
					},
				},
			},
			graphqlObjectType: 'Object',
			allObjects: {},
		}).getGraphqlFields('SimpleObject')

		const expectedGraphqlObject = new GraphQLObjectType({
			name: 'SimpleObjectSubObject',
			fields: {
				name: {
					type: new GraphQLNonNull(GraphQLString),
				},
			},
		})

		expect(
			deepCompareGraphQLObjects(
				recursiveObject.subObject.type,
				expectedGraphqlObject,
			),
		).toEqual(true)
	})
})
