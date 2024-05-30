import { describe, expect, it, beforeAll } from 'bun:test'
import { v4 as uuid } from 'uuid'
import { WibeApp } from '../server'
import getPort from 'get-port'
import { DatabaseEnum } from '../database'
import { gql } from 'graphql-request'
import { getGraphqlClient } from '../utils/helper'
import { Schema, type SchemaInterface } from '../schema'
import { GraphQLSchema, GraphQLObjectType } from 'graphql'
import { GraphQLSchema as WibeGraphQLSchema } from './GraphQLSchema'
import { getTypeFromGraphQLSchema } from './parseGraphqlSchema'

const createWibeApp = async (schema: SchemaInterface) => {
	const databaseId = uuid()

	const port = await getPort()

	const wibeApp = new WibeApp({
		port,
		schema,
		wibeKey:
			'0uwFvUxM$ceFuF1aEtTtZMa7DUN2NZudqgY5ve5W*QCyb58cwMj9JeoaV@d#%29v&aJzswuudVU1%nAT+rxS0Bh&OkgBYc0PH18*',
		database: {
			type: DatabaseEnum.Mongo,
			url: 'mongodb://127.0.0.1:27045',
			name: databaseId,
		},
	})

	await wibeApp.start()

	const client = getGraphqlClient(port)

	return { client, wibeApp }
}

describe('GraphqlSchema', () => {
	let schema: GraphQLSchema

	beforeAll(() => {
		const wibeSchema = new Schema({
			class: [
				{
					name: 'TestClass',
					fields: { field1: { type: 'String' } },
					resolvers: {
						mutations: {
							customMutation: {
								type: 'Boolean',
								resolve: () => true,
							},
						},
						queries: {
							customQuery: {
								type: 'Boolean',
								resolve: () => true,
							},
						},
					},
				},
				{
					name: 'SecondClass',
					fields: {
						// @ts-expect-error
						pointer: { type: 'Pointer', class: 'TestClass' },
					},
				},
				{
					name: 'ThirdClass',
					fields: {
						pointer: {
							type: 'Pointer',
							// @ts-expect-error
							class: 'FourthClass',
						},
					},
				},
				{
					name: 'FourthClass',
					fields: {
						pointer: {
							type: 'Pointer',
							// @ts-expect-error
							class: 'ThirdClass',
						},
					},
				},
				{
					name: 'FifthClass',
					fields: {
						relation: {
							type: 'Relation',
							// @ts-expect-error
							class: 'SixthClass',
						},
					},
				},
				{
					name: 'SixthClass',
					fields: {
						field6: { type: 'String' },
					},
				},
			],
		})

		const graphqlSchema = new WibeGraphQLSchema(wibeSchema)

		const types = graphqlSchema.createSchema()

		schema = new GraphQLSchema({
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
	})

	it('should have a custom enum as value in type', async () => {
		const { client, wibeApp } = await createWibeApp({
			class: [
				{
					name: 'TestClass',
					fields: {
						field1: {
							// @ts-expect-error
							type: 'CustomEnum',
						},
					},
				},
			],
			enums: [
				{
					name: 'CustomEnum',
					values: {
						Value1: 'Value1',
						Value2: 'Value2',
					},
				},
			],
		})

		await client.request<any>(gql`
			mutation createTestClass {
				createTestClass(input: { fields: { field1: Value1 } }) {
					testClass {
						field1
					}
				}
			}
		`)

		const res = await client.request<any>(gql`
			query testClasses {
				testClasses(where: { field1: { equalTo: "Value1" } }) {
					edges {
						node {
							id
							field1
						}
					}
				}
			}
		`)

		expect(res.testClasses.edges.length).toBe(1)
		expect(res.testClasses.edges[0].node.field1).toBe('Value1')

		const resNotEqual = await client.request<any>(gql`
			query testClasses {
				testClasses(where: { field1: { notEqualTo: "Value1" } }) {
					edges {
						node {
							id
							field1
						}
					}
				}
			}
		`)

		expect(resNotEqual.testClasses.edges.length).toBe(0)

		await wibeApp.close()
	})

	it('should have id in WhereInput object', () => {
		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Type',
				name: 'TestClassWhereInput',
			}).input,
		).toEqual({
			id: 'IdWhereInput',
			AND: '[TestClassWhereInput]',
			OR: '[TestClassWhereInput]',
			field1: 'StringWhereInput',
		})
	})

	it('should have ConnectionObject on field of relation in ObjectType', () => {
		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Type',
				name: 'FifthClass',
			}).input,
		).toEqual({
			id: 'ID!',
			relation: 'SixthClassConnection',
		})
	})

	it('should have a TestClassRelationInput', () => {
		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Type',
				name: 'TestClassRelationInput',
			}).input,
		).toEqual({
			add: '[ID!]',
			remove: '[ID!]',
			createAndAdd: '[TestClassCreateFieldsInput!]',
		})
	})

	it('should have a RelationInput on SixthClass on field relation of FifthClass', () => {
		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Type',
				name: 'FifthClassInput',
			}).input,
		).toEqual({
			relation: 'SixthClassRelationInput',
		})
	})

	it('should have the pointer in the object when there is a circular dependency in pointer', () => {
		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Type',
				name: 'ThirdClass',
			}).input,
		).toEqual({
			id: 'ID!',
			pointer: 'FourthClass',
		})

		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Type',
				name: 'FourthClass',
			}).input,
		).toEqual({
			id: 'ID!',
			pointer: 'ThirdClass',
		})

		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Type',
				name: 'ThirdClassInput',
			}).input,
		).toEqual({
			pointer: 'FourthClassPointerInput',
		})

		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Type',
				name: 'FourthClassInput',
			}).input,
		).toEqual({
			pointer: 'ThirdClassPointerInput',
		})

		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Type',
				name: 'ThirdClassPointerInput',
			}).input,
		).toEqual({
			link: 'ID',
			createAndLink: 'ThirdClassCreateFieldsInput',
		})

		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Type',
				name: 'FourthClassPointerInput',
			}).input,
		).toEqual({
			link: 'ID',
			createAndLink: 'FourthClassCreateFieldsInput',
		})
	})

	it('should have TestClassPointerInput', () => {
		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Type',
				name: 'TestClassPointerInput',
			}).input,
		).toEqual({
			link: 'ID',
			createAndLink: 'TestClassCreateFieldsInput',
		})
	})

	it('should have a type with a pointer to TestClass', () => {
		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Type',
				name: 'SecondClass',
			}),
		).toEqual({
			input: {
				id: 'ID!',
				pointer: 'TestClass',
			},
		})
	})

	it('should have pointer input on SecondClassCreateFieldsInput', () => {
		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Type',
				name: 'SecondClassCreateFieldsInput',
			}),
		).toEqual({
			input: {
				pointer: 'TestClassPointerInput',
			},
		})
	})

	it('should have pointer input on SecondClassUpdateFieldsInput', () => {
		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Type',
				name: 'SecondClassUpdateFieldsInput',
			}),
		).toEqual({
			input: {
				pointer: 'TestClassPointerInput',
			},
		})
	})

	it('should have ClassCreateInputFieldsInput', () => {
		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Type',
				name: 'TestClassCreateFieldsInput',
			}).input,
		).toEqual({
			field1: 'String',
		})
	})

	it('should have ClassUpdateInputFieldsInput', () => {
		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Type',
				name: 'TestClassUpdateFieldsInput',
			}).input,
		).toEqual({
			field1: 'String',
		})
	})

	it('should get correct CreateTestClassPaylod type', () => {
		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Type',
				name: 'CreateTestClassPayload',
			}).input,
		).toEqual({
			clientMutationId: 'String',
			testClass: 'TestClass',
		})
	})

	it('should return graphql relay standard output for default get query', () => {
		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Query',
				name: 'testClass',
			}),
		).toEqual({
			input: {
				id: 'ID',
			},
			output: 'TestClass',
		})
	})

	it('should return graphql relay standard output for default get query (multiple)', () => {
		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Query',
				name: 'testClasses',
			}),
		).toEqual({
			input: {
				limit: 'Int',
				offset: 'Int',
				where: 'TestClassWhereInput',
			},
			output: 'TestClassConnection!',
		})
	})

	it('should return graphql relay standard output for default create mutation', () => {
		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Mutation',
				name: 'createTestClass',
			}),
		).toEqual({
			input: { input: 'CreateTestClassInput' },
			output: 'CreateTestClassPayload',
		})
	})

	it('should return graphql relay standard output for default creates mutation (multiple)', () => {
		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Mutation',
				name: 'createTestClasses',
			}),
		).toEqual({
			input: { input: 'CreateTestClassesInput' },
			output: 'TestClassConnection!',
		})
	})

	it('should return graphql relay standard output for default update mutation (clientMutationId, type)', () => {
		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Mutation',
				name: 'updateTestClass',
			}),
		).toEqual({
			input: { input: 'UpdateTestClassInput' },
			output: 'UpdateTestClassPayload',
		})
	})

	it('should return graphql relay standard output for default updates (multiple) mutation', () => {
		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Mutation',
				name: 'updateTestClasses',
			}),
		).toEqual({
			input: { input: 'UpdateTestClassesInput' },
			output: 'TestClassConnection!',
		})
	})

	it('should return graphql relay standard output for default delete mutation (clientMutationId, type)', () => {
		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Mutation',
				name: 'deleteTestClass',
			}),
		).toEqual({
			input: { input: 'DeleteTestClassInput' },
			output: 'DeleteTestClassPayload',
		})
	})

	it('should return graphql relay standard output for default deletes (multiple) mutation', () => {
		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Mutation',
				name: 'deleteTestClasses',
			}),
		).toEqual({
			input: { input: 'DeleteTestClassesInput' },
			output: 'TestClassConnection!',
		})
	})

	it('should not create input for mutation when there is no field', () => {
		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Mutation',
				name: 'customMutation',
			}),
		).toEqual({
			input: {},
			output: 'Boolean',
		})
	})

	it('should create custom query with no args', () => {
		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Query',
				name: 'customQuery',
			}),
		).toEqual({
			input: {},
			output: 'Boolean',
		})
	})

	it('should create mutation with sub input', async () => {
		const { client, wibeApp } = await createWibeApp({
			class: [
				{
					name: 'TestClass',
					fields: { field1: { type: 'String' } },
					resolvers: {
						mutations: {
							customMutation: {
								type: 'Int',
								args: {
									input: {
										sum: {
											type: 'Object',
											object: {
												name: 'Sum',
												fields: {
													a: {
														type: 'Int',
														required: true,
													},
													b: {
														type: 'Int',
														required: true,
													},
												},
											},
										},
									},
								},
								resolve: (_: any, args: any) =>
									args.input.sum.a + args.input.sum.b,
							},
						},
					},
				},
			],
		})

		const request = await client.request<any>(
			gql`
				mutation customMutation {
					customMutation(input: { sum: { a: 1, b: 2 } })
				}
			`,
			{},
		)

		expect(request.customMutation).toBe(3)

		await wibeApp.close()
	})

	it('should create mutation with sub sub input', async () => {
		const { client, wibeApp } = await createWibeApp({
			class: [
				{
					name: 'TestClass',
					fields: { field1: { type: 'String' } },
					resolvers: {
						mutations: {
							customMutation: {
								type: 'Int',
								args: {
									input: {
										subObject: {
											type: 'Object',
											object: {
												name: 'SubObject',
												fields: {
													sum: {
														type: 'Object',
														object: {
															name: 'Sum',
															fields: {
																a: {
																	type: 'Int',
																	required:
																		true,
																},
																b: {
																	type: 'Int',
																	required:
																		true,
																},
															},
														},
													},
												},
											},
										},
									},
								},
								resolve: (_: any, args: any) =>
									args.input.subObject.sum.a +
									args.input.subObject.sum.b,
							},
						},
					},
				},
			],
		})

		const request = await client.request<any>(
			gql`
				mutation customMutation {
					customMutation(
						input: { subObject: { sum: { a: 1, b: 2 } } }
					)
				}
			`,
			{},
		)

		expect(request.customMutation).toBe(3)

		await wibeApp.close()
	})

	it('should create custom mutation with sub object and correct input name', async () => {
		const { client, wibeApp } = await createWibeApp({
			class: [
				{
					name: 'TestClass',
					fields: { field1: { type: 'String' } },
					resolvers: {
						mutations: {
							customMutation: {
								type: 'Int',
								args: {
									input: {
										sum: {
											type: 'Object',
											object: {
												name: 'Sum',
												fields: {
													a: {
														type: 'Int',
														required: true,
													},
													b: {
														type: 'Int',
														required: true,
													},
												},
											},
										},
									},
								},
								resolve: (_: any, args: any) =>
									args.input.sum.a + args.input.sum.b,
							},
						},
					},
				},
			],
		})

		const request = await client.request<any>(
			gql`
				mutation customMutation($sum: CustomMutationSumInput!) {
					customMutation(input: { sum: $sum })
				}
			`,
			{
				sum: {
					a: 1,
					b: 2,
				},
			},
		)

		expect(request.customMutation).toBe(3)

		const request2 = await client.request<any>(
			gql`
				mutation customMutation($input: CustomMutationInput!) {
					customMutation(input: $input)
				}
			`,
			{
				input: {
					sum: {
						a: 1,
						b: 2,
					},
				},
			},
		)

		expect(request2.customMutation).toBe(3)

		await wibeApp.close()
	})

	it('should create a sub object with the good type', async () => {
		const { client, wibeApp } = await createWibeApp({
			class: [
				{
					name: 'TestClass',
					fields: {
						field1: {
							type: 'Object',
							object: {
								name: 'SubOject',
								fields: {
									field2: { type: 'String' },
									field3: { type: 'Int' },
								},
							},
						},
					},
				},
			],
		})

		await client.request<any>(
			gql`
				mutation createTestClass {
					createTestClass(
						input: {
							fields: { field1: { field2: "test", field3: 1 } }
						}
					) {
						testClass {
							field1 {
								field2
							}
						}
					}
				}
			`,
			{},
		)

		const request = await client.request<any>(
			gql`
				query testClasses(
					$field1WhereInput: TestClassSubOjectWhereInput
				) {
					testClasses(where: { field1: $field1WhereInput }) {
						edges {
							node {
								field1 {
									field2
									field3
								}
							}
						}
					}
				}
			`,
			{
				field1WhereInput: {
					field2: { equalTo: 'test' },
				},
			},
		)

		expect(request.testClasses.edges[0].node.field1.field2).toBe('test')
		expect(request.testClasses.edges[0].node.field1.field3).toBe(1)

		await wibeApp.close()
	})

	it('should create an object with a pointer (createAndLink)', async () => {
		const { client, wibeApp } = await createWibeApp({
			class: [
				{
					name: 'TestClass',
					fields: {
						field1: {
							type: 'String',
						},
					},
				},
				{
					name: 'TestClass2',
					fields: {
						name: {
							type: 'String',
						},
						field2: {
							type: 'Pointer',
							// @ts-expect-error
							class: 'TestClass',
						},
					},
				},
			],
		})

		const res = await client.request<any>(
			gql`
				mutation createTestClass {
					createTestClass2(
						input: {
							fields: {
								name: "name"
								field2: { createAndLink: { field1: "field1" } }
							}
						}
					) {
						testClass2 {
							name
							field2 {
								field1
							}
						}
					}
				}
			`,
			{},
		)

		expect(res.createTestClass2.testClass2.name).toBe('name')
		expect(res.createTestClass2.testClass2.field2.field1).toBe('field1')

		await wibeApp.close()
	})

	it('should link an object to a pointer', async () => {
		const { client, wibeApp } = await createWibeApp({
			class: [
				{
					name: 'TestClass',
					fields: {
						field1: {
							type: 'String',
						},
					},
				},
				{
					name: 'TestClass2',
					fields: {
						name: {
							type: 'String',
						},
						field2: {
							type: 'Pointer',
							// @ts-expect-error
							class: 'TestClass',
						},
					},
				},
			],
		})

		const {
			createTestClass: {
				testClass: { id: idOfTestClass },
			},
		} = await client.request<any>(
			gql`
				mutation createTestClass {
					createTestClass(input: { fields: { field1: "field1" } }) {
						testClass {
							id
						}
					}
				}
			`,
			{},
		)

		const res = await client.request<any>(
			gql`
					mutation createTestClass {
						createTestClass2(
							input: {
								fields: {
									name: "name"
									field2: {
										link: "${idOfTestClass}"
									}
								}
							}
						) {
							testClass2 {
								name
								field2 {
									field1
								}
							}
						}
					}
				`,
			{},
		)

		expect(res.createTestClass2.testClass2.name).toBe('name')
		expect(res.createTestClass2.testClass2.field2.field1).toBe('field1')

		await wibeApp.close()
	})

	it('should link a pointer on create multiple object', async () => {
		const { client, wibeApp } = await createWibeApp({
			class: [
				{
					name: 'TestClass',
					fields: {
						field1: {
							type: 'String',
						},
					},
				},
				{
					name: 'TestClass2',
					fields: {
						name: {
							type: 'String',
						},
						field2: {
							type: 'Pointer',
							// @ts-expect-error
							class: 'TestClass',
						},
					},
				},
			],
		})

		const res = await client.request<any>(
			gql`
				mutation createTestClass2s {
					createTestClass2s(
						input: {
							fields: [
								{
									name: "name"
									field2: {
										createAndLink: { field1: "field1" }
									}
								}
							]
						}
					) {
						edges {
							node {
								name
								field2 {
									field1
								}
							}
						}
					}
				}
			`,
			{},
		)

		expect(res.createTestClass2s.edges[0].node.name).toBe('name')
		expect(res.createTestClass2s.edges[0].node.field2.field1).toBe('field1')

		await wibeApp.close()
	})

	it('should create and link a pointer on update', async () => {
		const { client, wibeApp } = await createWibeApp({
			class: [
				{
					name: 'TestClass',
					fields: {
						field1: {
							type: 'String',
						},
					},
				},
				{
					name: 'TestClass2',
					fields: {
						name: {
							type: 'String',
						},
						field2: {
							type: 'Pointer',
							// @ts-expect-error
							class: 'TestClass',
						},
					},
				},
			],
		})

		const res = await client.request<any>(
			gql`
				mutation createTestClass {
					createTestClass2(
						input: {
							fields: {
								name: "name"
								field2: { createAndLink: { field1: "field1" } }
							}
						}
					) {
						testClass2 {
							id
							name
							field2 {
								field1
							}
						}
					}
				}
			`,
			{},
		)

		expect(res.createTestClass2.testClass2.name).toBe('name')
		expect(res.createTestClass2.testClass2.field2.field1).toBe('field1')

		const resAfterUpdate = await client.request<any>(gql`
			mutation updateTestClass {
				updateTestClass2(
					input: {
						fields: {
							field2: {
								createAndLink: { field1: "field1AfterUpdate" }
							}
						}
						id: "${res.createTestClass2.testClass2.id}"
					}
				) {
					testClass2 {
						name
						field2 {
							field1
						}
					}
				}
			}
		`)

		expect(resAfterUpdate.updateTestClass2.testClass2.name).toBe('name')
		expect(resAfterUpdate.updateTestClass2.testClass2.field2.field1).toBe(
			'field1AfterUpdate',
		)

		await wibeApp.close()
	})

	it('should link a pointer on update', async () => {
		const { client, wibeApp } = await createWibeApp({
			class: [
				{
					name: 'TestClass',
					fields: {
						field1: {
							type: 'String',
						},
					},
				},
				{
					name: 'TestClass2',
					fields: {
						name: {
							type: 'String',
						},
						field2: {
							type: 'Pointer',
							// @ts-expect-error
							class: 'TestClass',
						},
					},
				},
			],
		})

		const {
			createTestClass: {
				testClass: { id: idOfTestClass },
			},
		} = await client.request<any>(
			gql`
				mutation createTestClass {
					createTestClass(input: { fields: { field1: "field1" } }) {
						testClass {
							id
						}
					}
				}
			`,
			{},
		)

		const res = await client.request<any>(
			gql`
				mutation createTestClass {
					createTestClass2(input: { fields: { name: "name" } }) {
						testClass2 {
							id
							name
						}
					}
				}
			`,
			{},
		)

		const resAfterUpdate = await client.request<any>(
			gql`
				mutation updateTestClass {
					updateTestClass2(input: {
  					id: "${res.createTestClass2.testClass2.id}"
  					fields: {
   				     field2: { link: "${idOfTestClass}" }
  					}
					}){
					  testClass2 {
							name
							field2{
							 field1
							}
						}
					}
				}
			`,
			{},
		)

		expect(resAfterUpdate.updateTestClass2.testClass2.name).toBe('name')
		expect(resAfterUpdate.updateTestClass2.testClass2.field2.field1).toBe(
			'field1',
		)

		await wibeApp.close()
	})

	it('should link a pointer on update multiple object', async () => {
		const { client, wibeApp } = await createWibeApp({
			class: [
				{
					name: 'TestClass',
					fields: {
						field1: {
							type: 'String',
						},
					},
				},
				{
					name: 'TestClass2',
					fields: {
						name: {
							type: 'String',
						},
						field2: {
							type: 'Pointer',
							// @ts-expect-error
							class: 'TestClass',
						},
					},
				},
			],
		})

		await client.request<any>(
			gql`
				mutation createTestClass2s {
					createTestClass2s(
						input: { fields: [{ name: "name" }, { name: "name2" }] }
					) {
						edges {
							node {
								name
								field2 {
									field1
								}
							}
						}
					}
				}
			`,
			{},
		)

		const resAfterUpdate = await client.request<any>(
			gql`
				mutation updateTestClass2s {
					updateTestClass2s(
						input: {
							where: { name: { equalTo: "name" } }
							fields: {
								field2: {
									createAndLink: {
										field1: "field1UpdateMultiple"
									}
								}
							}
						}
					) {
						edges {
							node {
								name
								field2 {
									field1
								}
							}
						}
					}
				}
			`,
			{},
		)

		expect(resAfterUpdate.updateTestClass2s.edges[0].node.name).toBe('name')
		expect(
			resAfterUpdate.updateTestClass2s.edges[0].node.field2.field1,
		).toBe('field1UpdateMultiple')

		await wibeApp.close()
	})

	it('should return pointer data on delete an element', async () => {
		const { client, wibeApp } = await createWibeApp({
			class: [
				{
					name: 'TestClass',
					fields: {
						field1: {
							type: 'String',
						},
					},
				},
				{
					name: 'TestClass2',
					fields: {
						name: {
							type: 'String',
						},
						field2: {
							type: 'Pointer',
							// @ts-expect-error
							class: 'TestClass',
						},
					},
				},
			],
		})

		const res = await client.request<any>(
			gql`
				mutation createTestClass {
					createTestClass2(
						input: {
							fields: {
								name: "name"
								field2: { createAndLink: { field1: "field1" } }
							}
						}
					) {
						testClass2 {
							id
							name
							field2 {
								field1
							}
						}
					}
				}
			`,
			{},
		)

		expect(res.createTestClass2.testClass2.name).toBe('name')
		expect(res.createTestClass2.testClass2.field2.field1).toBe('field1')

		const resAfterDelete = await client.request<any>(gql`
			mutation deleteTestClass2 {
				deleteTestClass2(input: {id: "${res.createTestClass2.testClass2.id}"}) {
					testClass2 {
					  name
						field2 {
							field1
						}
					}
				}
			}
		`)

		expect(resAfterDelete.deleteTestClass2.testClass2.name).toBe('name')
		expect(resAfterDelete.deleteTestClass2.testClass2.field2.field1).toBe(
			'field1',
		)

		await wibeApp.close()
	})

	it('should createAndAdd an object on a relation field (on create)', async () => {
		const { client, wibeApp } = await createWibeApp({
			class: [
				{
					name: 'TestClass',
					fields: {
						field1: {
							type: 'String',
						},
					},
				},
				{
					name: 'TestClass2',
					fields: {
						name: {
							type: 'String',
						},
						field2: {
							type: 'Relation',
							// @ts-expect-error
							class: 'TestClass',
						},
					},
				},
			],
		})

		const res = await client.request<any>(gql`
			mutation createTestClass2 {
				createTestClass2(
					input: {
						fields: {
							name: "name"
							field2: { createAndAdd: [{ field1: "field1" }] }
						}
					}
				) {
					testClass2 {
						name
						field2 {
							edges {
								node {
									field1
								}
							}
						}
					}
				}
			}
		`)

		expect(res.createTestClass2.testClass2.name).toBe('name')
		expect(
			res.createTestClass2.testClass2.field2.edges[0].node.field1,
		).toBe('field1')

		await wibeApp.close()
	})

	it('should add an object on a relation field (on create)', async () => {
		const { client, wibeApp } = await createWibeApp({
			class: [
				{
					name: 'TestClass',
					fields: {
						field1: {
							type: 'String',
						},
					},
				},
				{
					name: 'TestClass2',
					fields: {
						name: {
							type: 'String',
						},
						field2: {
							type: 'Relation',
							// @ts-expect-error
							class: 'TestClass',
						},
					},
				},
			],
		})

		const res = await client.request<any>(gql`
			mutation createTestClass {
				createTestClass(input: { fields: { field1: "field1" } }) {
					testClass {
						id
					}
				}
			}
		`)

		const resAfterAdd = await client.request<any>(gql`
			mutation createTestClass2 {
				createTestClass2(
					input: {
						fields: {
							name: "name"
							field2: { add: ["${res.createTestClass.testClass.id}"] }
						}
					}
				) {
					testClass2 {
						name
						field2 {
							edges {
								node {
									field1
								}
							}
						}
					}
				}
			}
		`)

		expect(resAfterAdd.createTestClass2.testClass2.name).toBe('name')
		expect(
			resAfterAdd.createTestClass2.testClass2.field2.edges[0].node.field1,
		).toBe('field1')

		await wibeApp.close()
	})

	it('should createAndAdd an object on a relation field (on createMany)', async () => {
		const { client, wibeApp } = await createWibeApp({
			class: [
				{
					name: 'TestClass',
					fields: {
						field1: {
							type: 'String',
						},
					},
				},
				{
					name: 'TestClass2',
					fields: {
						name: {
							type: 'String',
						},
						field2: {
							type: 'Relation',
							// @ts-expect-error
							class: 'TestClass',
						},
					},
				},
			],
		})

		const res = await client.request<any>(gql`
			mutation createTestClass2s {
				createTestClass2s(
					input: {
						fields: [
							{
								name: "name"
								field2: { createAndAdd: [{ field1: "field1" }] }
							}
						]
					}
				) {
					edges {
						node {
							name
							field2 {
								edges {
									node {
										field1
									}
								}
							}
						}
					}
				}
			}
		`)

		expect(res.createTestClass2s.edges[0].node.name).toBe('name')
		expect(
			res.createTestClass2s.edges[0].node.field2.edges[0].node.field1,
		).toBe('field1')

		await wibeApp.close()
	})

	it('should add an object on a relation field (on createMany)', async () => {
		const { client, wibeApp } = await createWibeApp({
			class: [
				{
					name: 'TestClass',
					fields: {
						field1: {
							type: 'String',
						},
					},
				},
				{
					name: 'TestClass2',
					fields: {
						name: {
							type: 'String',
						},
						field2: {
							type: 'Relation',
							// @ts-expect-error
							class: 'TestClass',
						},
					},
				},
			],
		})

		const res = await client.request<any>(gql`
			mutation createTestClass {
				createTestClass(input: { fields: { field1: "field1" } }) {
					testClass {
						id
					}
				}
			}
		`)

		const resAfterAdd = await client.request<any>(gql`
			mutation createTestClass2s {
				createTestClass2s(
					input: {
						fields: [
							{
								name: "name"
								field2: { add: ["${res.createTestClass.testClass.id}"] }
							}
						]
					}
				) {
					edges {
						node {
							name
							field2 {
								edges {
									node {
										field1
									}
								}
							}
						}
					}
				}
			}
		`)

		expect(resAfterAdd.createTestClass2s.edges[0].node.name).toBe('name')
		expect(
			resAfterAdd.createTestClass2s.edges[0].node.field2.edges[0].node
				.field1,
		).toBe('field1')

		await wibeApp.close()
	})

	it('should createAndAdd an object on a relation field (on update)', async () => {
		const { client, wibeApp } = await createWibeApp({
			class: [
				{
					name: 'TestClass',
					fields: {
						field1: {
							type: 'String',
						},
					},
				},
				{
					name: 'TestClass2',
					fields: {
						name: {
							type: 'String',
						},
						field2: {
							type: 'Relation',
							// @ts-expect-error
							class: 'TestClass',
						},
					},
				},
			],
		})

		const resAfterAdd = await client.request<any>(gql`
			mutation createTestClass2 {
				createTestClass2(input: { fields: { name: "name" } }) {
					testClass2 {
						id
						name
					}
				}
			}
		`)

		const resAfterUpdate = await client.request<any>(gql`
			mutation updateTestClass2 {
				updateTestClass2(
					input: {
						id: "${resAfterAdd.createTestClass2.testClass2.id}"
						fields: {
							field2: { createAndAdd: [{ field1: "field1" }] }
						}
					}
				) {
					testClass2 {
						id
						name
						field2 {
							edges {
  							node {
  							   field1
  							}
							}
						}
					}
				}
			}
		`)

		expect(resAfterUpdate.updateTestClass2.testClass2.name).toBe('name')
		expect(
			resAfterUpdate.updateTestClass2.testClass2.field2.edges[0].node
				.field1,
		).toBe('field1')

		await wibeApp.close()
	})

	it('should add an object on a relation field (on update)', async () => {
		const { client, wibeApp } = await createWibeApp({
			class: [
				{
					name: 'TestClass',
					fields: {
						field1: {
							type: 'String',
						},
					},
				},
				{
					name: 'TestClass2',
					fields: {
						name: {
							type: 'String',
						},
						field2: {
							type: 'Relation',
							// @ts-expect-error
							class: 'TestClass',
						},
					},
				},
			],
		})

		const res = await client.request<any>(gql`
			mutation createTestClass {
				createTestClass(input: { fields: { field1: "field1" } }) {
					testClass {
						id
					}
				}
			}
		`)

		const resAfterAdd = await client.request<any>(gql`
			mutation createTestClass2 {
				createTestClass2(input: { fields: { name: "name" } }) {
					testClass2 {
						id
						name
					}
				}
			}
		`)

		const resAfterUpdate = await client.request<any>(gql`
			mutation updateTestClass2 {
				updateTestClass2(
					input: {
						id: "${resAfterAdd.createTestClass2.testClass2.id}"
						fields: {
							field2: { add: ["${res.createTestClass.testClass.id}"] }
						}
					}
				) {
					testClass2 {
						id
						name
						field2 {
							edges {
  							node {
  							   field1
  							}
							}
						}
					}
				}
			}
		`)

		expect(resAfterUpdate.updateTestClass2.testClass2.name).toBe('name')
		expect(
			resAfterUpdate.updateTestClass2.testClass2.field2.edges[0].node
				.field1,
		).toBe('field1')

		await wibeApp.close()
	})

	it('should remove an object on a relation field (on update)', async () => {
		const { client, wibeApp } = await createWibeApp({
			class: [
				{
					name: 'TestClass',
					fields: {
						field1: {
							type: 'String',
						},
					},
				},
				{
					name: 'TestClass2',
					fields: {
						name: {
							type: 'String',
						},
						field2: {
							type: 'Relation',
							// @ts-expect-error
							class: 'TestClass',
						},
					},
				},
			],
		})

		const resAfterAdd = await client.request<any>(gql`
			mutation createTestClass2 {
				createTestClass2(
					input: {
						fields: {
							name: "name"
							field2: { createAndAdd: [{ field1: "field1" }] }
						}
					}
				) {
					testClass2 {
						id
						name
						field2 {
							edges {
								node {
									id
									field1
								}
							}
						}
					}
				}
			}
		`)

		const resAfterUpdate = await client.request<any>(gql`
			mutation updateTestClass2 {
				updateTestClass2(
					input: {
						id: "${resAfterAdd.createTestClass2.testClass2.id}"
						fields: {
							field2: { remove: ["${resAfterAdd.createTestClass2.testClass2.field2.edges[0].node.id}"] }
						}
					}
				) {
					testClass2 {
						id
						name
						field2 {
							edges {
  							node {
  							   field1
  							}
							}
						}
					}
				}
			}
		`)

		expect(resAfterUpdate.updateTestClass2.testClass2.name).toBe('name')
		expect(
			resAfterUpdate.updateTestClass2.testClass2.field2.edges.length,
		).toEqual(0)

		await wibeApp.close()
	})

	it('should createAndAdd an object on a relation field (on updateMany)', async () => {
		const { client, wibeApp } = await createWibeApp({
			class: [
				{
					name: 'TestClass',
					fields: {
						field1: {
							type: 'String',
						},
					},
				},
				{
					name: 'TestClass2',
					fields: {
						name: {
							type: 'String',
						},
						field2: {
							type: 'Relation',
							// @ts-expect-error
							class: 'TestClass',
						},
					},
				},
			],
		})

		const resAfterAdd = await client.request<any>(gql`
			mutation createTestClass2 {
				createTestClass2(input: { fields: { name: "name" } }) {
					testClass2 {
						id
						name
					}
				}
			}
		`)

		const resAfterUpdate = await client.request<any>(gql`
			mutation updateTestClass2s {
				updateTestClass2s(
					input: {
						where: {id: {equalTo: "${resAfterAdd.createTestClass2.testClass2.id}"}}
						fields: {
							field2: { createAndAdd: [{ field1: "field1" }] }
						}
					}
				) {
					edges {
						node {
							id
							name
							field2 {
								edges {
									node {
										field1
									}
								}
							}
						}
					}
				}
			}
		`)

		expect(resAfterUpdate.updateTestClass2s.edges[0].node.name).toBe('name')
		expect(
			resAfterUpdate.updateTestClass2s.edges[0].node.field2.edges[0].node
				.field1,
		).toBe('field1')

		await wibeApp.close()
	})

	it('should add an object on a relation field (on updateMany)', async () => {
		const { client, wibeApp } = await createWibeApp({
			class: [
				{
					name: 'TestClass',
					fields: {
						field1: {
							type: 'String',
						},
					},
				},
				{
					name: 'TestClass2',
					fields: {
						name: {
							type: 'String',
						},
						field2: {
							type: 'Relation',
							// @ts-expect-error
							class: 'TestClass',
						},
					},
				},
			],
		})

		const res = await client.request<any>(gql`
			mutation createTestClass {
				createTestClass(input: { fields: { field1: "field1" } }) {
					testClass {
						id
					}
				}
			}
		`)

		const resAfterAdd = await client.request<any>(gql`
			mutation createTestClass2 {
				createTestClass2(input: { fields: { name: "name" } }) {
					testClass2 {
						id
						name
					}
				}
			}
		`)

		const resAfterUpdate = await client.request<any>(gql`
			mutation updateTestClass2s {
				updateTestClass2s(
					input: {
						where: {id: {equalTo: "${resAfterAdd.createTestClass2.testClass2.id}"}}
						fields: {
							field2: { add: ["${res.createTestClass.testClass.id}"] }
						}
					}
				) {
					edges {
						node {
							id
							name
							field2 {
								edges {
									node {
										field1
									}
								}
							}
						}
					}
				}
			}
		`)

		expect(resAfterUpdate.updateTestClass2s.edges[0].node.name).toBe('name')
		expect(
			resAfterUpdate.updateTestClass2s.edges[0].node.field2.edges[0].node
				.field1,
		).toBe('field1')

		await wibeApp.close()
	})

	it('should remove an object on a relation field (on updateMany)', async () => {
		const { client, wibeApp } = await createWibeApp({
			class: [
				{
					name: 'TestClass',
					fields: {
						field1: {
							type: 'String',
						},
					},
				},
				{
					name: 'TestClass2',
					fields: {
						name: {
							type: 'String',
						},
						field2: {
							type: 'Relation',
							// @ts-expect-error
							class: 'TestClass',
						},
					},
				},
			],
		})

		const resAfterAdd = await client.request<any>(gql`
			mutation createTestClass2 {
				createTestClass2(
					input: {
						fields: {
							name: "name"
							field2: { createAndAdd: [{ field1: "field1" }] }
						}
					}
				) {
					testClass2 {
						id
						name
						field2 {
							edges {
								node {
									id
									field1
								}
							}
						}
					}
				}
			}
		`)

		const resAfterUpdate = await client.request<any>(gql`
			mutation updateTestClass2s {
				updateTestClass2s(
					input: {
						where: {id: {equalTo: "${resAfterAdd.createTestClass2.testClass2.id}"}}
						fields: {
							field2: { remove: ["${resAfterAdd.createTestClass2.testClass2.field2.edges[0].node.id}"] }
						}
					}
				) {
					edges {
						node {
							id
							name
							field2 {
								edges {
									node {
										field1
									}
								}
							}
						}
					}
				}
			}
		`)

		expect(resAfterUpdate.updateTestClass2s.edges[0].node.name).toBe('name')
		expect(
			resAfterUpdate.updateTestClass2s.edges[0].node.field2.edges.length,
		).toBe(0)

		await wibeApp.close()
	})
})
