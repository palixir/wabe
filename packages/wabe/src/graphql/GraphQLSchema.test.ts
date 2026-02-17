import { beforeAll, describe, expect, it } from 'bun:test'
import getPort from 'get-port'
import { GraphQLObjectType, GraphQLSchema } from 'graphql'
import { gql } from 'graphql-request'
import { v4 as uuid } from 'uuid'
import { Schema, type SchemaInterface } from '../schema'
import { Wabe } from '../server'
import { type DevWabeTypes, getAnonymousClient, getGraphqlClient } from '../utils/helper'
import { GraphQLSchema as WabeGraphQLSchema } from './GraphQLSchema'
import { getTypeFromGraphQLSchema } from './parseGraphqlSchema'
import { getDatabaseAdapter } from '../utils/testHelper'

const createWabe = async (schema: SchemaInterface<DevWabeTypes>) => {
	const databaseId = uuid()

	const port = await getPort()

	const wabe = new Wabe({
		isProduction: false,
		port,
		schema,
		rootKey: 'dev',
		database: {
			// @ts-expect-error
			adapter: await getDatabaseAdapter(databaseId),
		},
		security: {
			disableCSRFProtection: true,
		},
	})

	await wabe.start()

	const client = getGraphqlClient(port)

	return { client, wabe, port }
}

describe('GraphqlSchema', () => {
	let schema: GraphQLSchema

	beforeAll(() => {
		const wabeSchema = new Schema({
			schema: {
				classes: [
					{
						name: 'TestClass2',
						fields: {
							field1: {
								type: 'Object',
								required: true,
								object: {
									name: 'TestObject',
									fields: {
										testSubObject: {
											type: 'Array',
											typeValue: 'Object',
											required: true,
											object: {
												name: 'FieldsObject',
												required: true,
												fields: {
													name: {
														type: 'String',
														required: true,
													},
												},
											},
										},
									},
								},
							},
						},
					},
					{
						name: 'TestClass',
						fields: { field1: { type: 'String' } },
					},
					{
						name: 'SecondClass',
						fields: {
							pointer: { type: 'Pointer', class: 'TestClass' },
						},
					},
					{
						name: 'ThirdClass',
						fields: {
							pointer: {
								type: 'Pointer',
								class: 'FourthClass',
							},
						},
					},
					{
						name: 'FourthClass',
						fields: {
							pointer: {
								type: 'Pointer',
								class: 'ThirdClass',
							},
						},
					},
					{
						name: 'FifthClass',
						fields: {
							relation: {
								type: 'Relation',
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
					{
						name: 'TestClassRequired',
						fields: {
							field7: {
								type: 'String',
								required: true,
							},
							field8: {
								type: 'Array',
								required: true,
								requiredValue: true,
								typeValue: 'Int',
							},
							field9: {
								type: 'Array',
								required: true,
								typeValue: 'Object',
								object: {
									name: 'TestObjectArray',
									fields: {
										field10: {
											type: 'Int',
											required: true,
										},
									},
								},
							},
						},
					},
					{
						name: 'TestClassFile',
						fields: {
							file: {
								type: 'File',
								required: true,
							},
						},
					},
				],
				resolvers: {
					mutations: {
						customMutation: {
							type: 'Boolean',
							resolve: () => true,
						},
						mutationWithCustomTypes: {
							type: 'Array',
							typeValue: 'Object',
							required: true,
							typeValueRequired: true,
							outputObject: {
								name: 'TestMutation',
								fields: {
									name: {
										type: 'String',
									},
								},
							},
							resolve: () => {
								return [{ name: 'test' }]
							},
						},
					},
					queries: {
						customQuery: {
							type: 'Boolean',
							resolve: () => true,
						},
						queryWithCustomTypes: {
							type: 'Array',
							typeValue: 'Object',
							required: true,
							typeValueRequired: true,
							outputObject: {
								name: 'TestQuery',
								fields: {
									name: {
										type: 'String',
									},
								},
							},
							resolve: () => {
								return [{ name: 'test' }]
							},
						},
					},
				},
			},
		} as any)

		const graphqlSchema = new WabeGraphQLSchema(wabeSchema)

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

	it('should work with fragments in all operations (query, create, update, delete) and nested fragments', async () => {
		const { wabe } = await createWabe({
			classes: [
				{
					name: 'TestClass',
					fields: {
						field: {
							type: 'String',
						},
						field1: {
							type: 'String',
						},
						field2: {
							type: 'String',
						},
					},
				},
			],
		})

		const rootClient = getGraphqlClient(wabe.config.port)

		// Define fragments for all operations
		const fragments = `
			fragment BasicFields on TestClass {
				id
				field
			}

			fragment ExtendedFields on TestClass {
				...BasicFields
				field1
				field2
			}
		`

		// Test CREATE operation with fragments
		const createResult = await rootClient.request<any>(gql`
			${fragments}
			mutation createTestClass {
				createTestClass(
					input: {
						fields: {
							field: "testField"
							field1: "value1"
							field2: "value2"
						}
					}
				) {
					testClass {
						...ExtendedFields
					}
				}
			}
		`)

		expect(createResult.createTestClass.testClass.field).toBe('testField')
		expect(createResult.createTestClass.testClass.field1).toBe('value1')
		expect(createResult.createTestClass.testClass.field2).toBe('value2')
		expect(createResult.createTestClass.testClass.id).toBeDefined()

		const objectId = createResult.createTestClass.testClass.id

		// Test QUERY operation with fragments (simple fragment)
		const queryResult = await rootClient.request<any>(gql`
			fragment Test on TestClass {
				id
				field
			}

			query testClasses {
				testClasses {
					edges {
						node {
							...Test
						}
					}
				}
			}
		`)

		expect(queryResult.testClasses.edges[0].node.field).toBe('testField')
		expect(queryResult.testClasses.edges[0].node.id).toBe(objectId)

		// Test UPDATE operation with fragments
		const updateResult = await rootClient.request<any>(gql`
			${fragments}
			mutation updateTestClass {
				updateTestClass(
					input: {
						id: "${objectId}"
						fields: { field: "updatedField", field1: "updated1", field2: "updated2" }
					}
				) {
					testClass {
						...ExtendedFields
					}
				}
			}
		`)

		expect(updateResult.updateTestClass.testClass.field).toBe('updatedField')
		expect(updateResult.updateTestClass.testClass.field1).toBe('updated1')
		expect(updateResult.updateTestClass.testClass.field2).toBe('updated2')
		expect(updateResult.updateTestClass.testClass.id).toBe(objectId)

		// Test DELETE operation with fragments
		const deleteResult = await rootClient.request<any>(gql`
			${fragments}
			mutation deleteTestClass {
				deleteTestClass(
					input: { id: "${objectId}" }
				) {
					testClass {
						...ExtendedFields
					}
				}
			}
		`)

		expect(deleteResult.deleteTestClass.testClass.field).toBe('updatedField')
		expect(deleteResult.deleteTestClass.testClass.field1).toBe('updated1')
		expect(deleteResult.deleteTestClass.testClass.field2).toBe('updated2')
		expect(deleteResult.deleteTestClass.testClass.id).toBe(objectId)

		await wabe.close()
	})

	it('should work with fragments in all operations (query, create, update, delete) and nested fragments', async () => {
		const { wabe } = await createWabe({
			classes: [
				{
					name: 'TestClass',
					fields: {
						field1: {
							type: 'String',
						},
						field2: {
							type: 'String',
						},
						field3: {
							type: 'String',
						},
						field4: {
							type: 'String',
						},
					},
				},
			],
		})

		const rootClient = getGraphqlClient(wabe.config.port)

		// Define fragments for all operations
		const fragments = `
			fragment BasicFields on TestClass {
				id
				field1
			}

			fragment ExtendedFields on TestClass {
				...BasicFields
				field2
			}

			fragment FullFields on TestClass {
				...ExtendedFields
				field3
			}

			fragment CompleteFields on TestClass {
				...FullFields
				field4
			}
		`

		// Test CREATE operation with fragments of fragments
		const createResult = await rootClient.request<any>(gql`
			${fragments}
			mutation createTestClass {
				createTestClass(
					input: {
						fields: {
							field1: "created1"
							field2: "created2"
							field3: "created3"
							field4: "created4"
						}
					}
				) {
					testClass {
						...CompleteFields
					}
				}
			}
		`)

		expect(createResult.createTestClass.testClass.field1).toBe('created1')
		expect(createResult.createTestClass.testClass.field2).toBe('created2')
		expect(createResult.createTestClass.testClass.field3).toBe('created3')
		expect(createResult.createTestClass.testClass.field4).toBe('created4')
		expect(createResult.createTestClass.testClass.id).toBeDefined()

		const objectId = createResult.createTestClass.testClass.id

		// Test QUERY operation with fragments of fragments
		const queryResult = await rootClient.request<any>(gql`
			${fragments}
			query testClass {
				testClass(id: "${objectId}") {
					...CompleteFields
				}
			}
		`)

		expect(queryResult.testClass.field1).toBe('created1')
		expect(queryResult.testClass.field2).toBe('created2')
		expect(queryResult.testClass.field3).toBe('created3')
		expect(queryResult.testClass.field4).toBe('created4')
		expect(queryResult.testClass.id).toBe(objectId)

		// Test UPDATE operation with fragments of fragments
		const updateResult = await rootClient.request<any>(gql`
			${fragments}
			mutation updateTestClass {
				updateTestClass(
					input: {
						id: "${objectId}"
						fields: { field1: "updated1", field2: "updated2", field3: "updated3", field4: "updated4" }
					}
				) {
					testClass {
						...CompleteFields
					}
				}
			}
		`)

		expect(updateResult.updateTestClass.testClass.field1).toBe('updated1')
		expect(updateResult.updateTestClass.testClass.field2).toBe('updated2')
		expect(updateResult.updateTestClass.testClass.field3).toBe('updated3')
		expect(updateResult.updateTestClass.testClass.field4).toBe('updated4')
		expect(updateResult.updateTestClass.testClass.id).toBe(objectId)

		// Test DELETE operation with fragments of fragments
		const deleteResult = await rootClient.request<any>(gql`
			${fragments}
			mutation deleteTestClass {
				deleteTestClass(input: { id: "${objectId}" }) {
					testClass {
						...CompleteFields
					}
				}
			}
		`)

		expect(deleteResult.deleteTestClass.testClass.field1).toBe('updated1')
		expect(deleteResult.deleteTestClass.testClass.field2).toBe('updated2')
		expect(deleteResult.deleteTestClass.testClass.field3).toBe('updated3')
		expect(deleteResult.deleteTestClass.testClass.field4).toBe('updated4')
		expect(deleteResult.deleteTestClass.testClass.id).toBe(objectId)

		await wabe.close()
	})

	it('should work with fragments across related classes in all operations', async () => {
		const { wabe } = await createWabe({
			classes: [
				{
					name: 'PremierClasse',
					fields: {
						field1: {
							type: 'String',
						},
					},
				},
				{
					name: 'DeuxiemeClasse',
					fields: {
						field2: {
							type: 'String',
						},
						premierClasses: {
							type: 'Relation',
							// @ts-expect-error
							class: 'PremierClasse',
						},
					},
				},
			],
		})

		const rootClient = getGraphqlClient(wabe.config.port)

		// Define fragments for related classes
		const fragments = `
			fragment TestPremierClasse on PremierClasse {
				id
				field1
			}

			fragment TestDeuxiemeClasse on DeuxiemeClasse {
				id
				field2
				premierClasses {
					edges {
						node {
							...TestPremierClasse
						}
					}
				}
			}
		`

		// Create a PremierClasse object first
		const premierClasseResult = await rootClient.request<any>(gql`
			mutation createPremierClasse {
				createPremierClasse(input: { fields: { field1: "premierValue" } }) {
					premierClasse {
						id
						field1
					}
				}
			}
		`)

		const premierClasseId = premierClasseResult.createPremierClasse.premierClasse.id

		// Test CREATE operation with fragments across related classes
		const createResult = await rootClient.request<any>(gql`
			${fragments}
			mutation createDeuxiemeClasse {
				createDeuxiemeClasse(
					input: {
						fields: {
							field2: "deuxiemeValue"
							premierClasses: {
								createAndAdd: [{ field1: "nestedPremierValue" }]
							}
						}
					}
				) {
					deuxiemeClasse {
						...TestDeuxiemeClasse
					}
				}
			}
		`)

		expect(createResult.createDeuxiemeClasse.deuxiemeClasse.field2).toBe('deuxiemeValue')
		expect(createResult.createDeuxiemeClasse.deuxiemeClasse.id).toBeDefined()
		expect(createResult.createDeuxiemeClasse.deuxiemeClasse.premierClasses.edges.length).toBe(1)
		expect(
			createResult.createDeuxiemeClasse.deuxiemeClasse.premierClasses.edges[0].node.field1,
		).toBe('nestedPremierValue')
		expect(
			createResult.createDeuxiemeClasse.deuxiemeClasse.premierClasses.edges[0].node.id,
		).toBeDefined()

		const deuxiemeClasseId = createResult.createDeuxiemeClasse.deuxiemeClasse.id

		// Test QUERY operation with fragments across related classes
		const queryResult = await rootClient.request<any>(gql`
			${fragments}
			query deuxiemeClass {
				deuxiemeClasse(id: "${deuxiemeClasseId}") {
					...TestDeuxiemeClasse
				}
			}
		`)

		expect(queryResult.deuxiemeClasse.field2).toBe('deuxiemeValue')
		expect(queryResult.deuxiemeClasse.id).toBe(deuxiemeClasseId)
		expect(queryResult.deuxiemeClasse.premierClasses.edges.length).toBe(1)
		expect(queryResult.deuxiemeClasse.premierClasses.edges[0].node.field1).toBe(
			'nestedPremierValue',
		)

		// Test UPDATE operation with fragments across related classes
		const updateResult = await rootClient.request<any>(gql`
			${fragments}
			mutation updateDeuxiemeClasse {
				updateDeuxiemeClasse(
					input: {
						id: "${deuxiemeClasseId}"
						fields: {
							field2: "updatedDeuxiemeValue"
							premierClasses: {
								add: ["${premierClasseId}"]
							}
						}
					}
				) {
					deuxiemeClasse {
						...TestDeuxiemeClasse
					}
				}
			}
		`)

		expect(updateResult.updateDeuxiemeClasse.deuxiemeClasse.field2).toBe('updatedDeuxiemeValue')
		expect(updateResult.updateDeuxiemeClasse.deuxiemeClasse.id).toBe(deuxiemeClasseId)
		expect(updateResult.updateDeuxiemeClasse.deuxiemeClasse.premierClasses.edges.length).toBe(2)

		// Test DELETE operation with fragments across related classes
		const deleteResult = await rootClient.request<any>(gql`
			${fragments}
			mutation deleteDeuxiemeClasse {
				deleteDeuxiemeClasse(input: { id: "${deuxiemeClasseId}" }) {
					deuxiemeClasse {
						...TestDeuxiemeClasse
					}
				}
			}
		`)

		expect(deleteResult.deleteDeuxiemeClasse.deuxiemeClasse.field2).toBe('updatedDeuxiemeValue')
		expect(deleteResult.deleteDeuxiemeClasse.deuxiemeClasse.id).toBe(deuxiemeClasseId)
		expect(deleteResult.deleteDeuxiemeClasse.deuxiemeClasse.premierClasses.edges.length).toBe(2)

		await wabe.close()
	})

	it('should be able to only get ok output on query / mutation that returns connection object', async () => {
		const { wabe, client } = await createWabe({
			classes: [
				{
					name: 'TestClass',
					fields: {
						field1: {
							type: 'String',
						},
					},
					permissions: {
						read: {
							authorizedRoles: [],
							requireAuthentication: true,
						},
					},
				},
			],
		})

		await client.request(gql`
			mutation deleteTestClasses {
				deleteTestClasses(input: { where: { field1: { equalTo: "field1" } } }) {
					ok
				}
			}
		`)

		await client.request(gql`
			query testsClasses {
				testClasses {
					ok
				}
			}
		`)

		await wabe.close()
	})

	it('should set correctly the where input on array field', async () => {
		const { wabe } = await createWabe({
			classes: [
				{
					name: 'TestClassOnly',
					fields: {
						field1: {
							type: 'Object',
							object: {
								name: 'TestObject',
								required: true,
								fields: {
									field1: {
										type: 'Array',
										typeValue: 'String',
										required: true,
										requiredValue: true,
									},
								},
							},
						},
					},
				},
			],
		})

		expect(
			getTypeFromGraphQLSchema({
				schema: wabe.config.graphqlSchema || ({} as any),
				type: 'Type',
				name: 'TestClassOnlyTestObjectWhereInput',
			}).input.field1,
		).toEqual('ArrayWhereInput')

		await wabe.close()
	})

	it('should set correctly the where input on object field', async () => {
		const { wabe } = await createWabe({
			classes: [
				{
					name: 'TestClassOnly',
					fields: {
						field1: {
							type: 'Object',
							object: {
								name: 'TestObject',
								required: true,
								fields: {
									field1: {
										type: 'Object',
										object: {
											name: 'TestTata',
											fields: {
												field2: {
													type: 'String',
												},
											},
										},
									},
								},
							},
						},
					},
				},
			],
		})

		expect(
			getTypeFromGraphQLSchema({
				schema: wabe.config.graphqlSchema || ({} as any),
				type: 'Type',
				name: 'TestClassOnlyTestObjectWhereInput',
			}).input.field1,
		).toEqual('TestClassOnlyTestObjectField1WhereInput')

		expect(
			getTypeFromGraphQLSchema({
				schema: wabe.config.graphqlSchema || ({} as any),
				type: 'Type',
				name: 'TestClassOnlyTestObjectField1WhereInput',
			}).input.field2,
		).toEqual('StringWhereInput')

		await wabe.close()
	})

	it('should request totalCount on relation', async () => {
		const { wabe } = await createWabe({
			classes: [
				{
					name: 'TestClass1',
					fields: {
						field1: {
							type: 'Relation',
							// @ts-expect-error
							class: 'TestClass2',
						},
					},
				},
				{
					name: 'TestClass2',
					fields: {
						field2: {
							type: 'String',
						},
					},
				},
			],
		})

		const rootClient = getGraphqlClient(wabe.config.port)

		const result1 = await rootClient.request<any>(gql`
			mutation createTestClass1 {
				createTestClass1(input: { fields: { field1: { createAndAdd: [{ field2: "field2" }] } } }) {
					testClass1 {
						id
					}
				}
			}
		`)

		const result2 = await rootClient.request<any>(gql`
      query testClass1 {
          testClass1(id: "${result1.createTestClass1.testClass1.id}") {
            field1 {
              totalCount
            }
          }
      }
      `)

		expect(result2.testClass1.field1.totalCount).toEqual(1)

		await wabe.close()
	})

	it('should request relation object on single object query', async () => {
		const { wabe } = await createWabe({
			classes: [
				{
					name: 'TestClass1',
					fields: {
						field1: {
							type: 'Relation',
							// @ts-expect-error
							class: 'TestClass2',
						},
					},
				},
				{
					name: 'TestClass2',
					fields: {
						field2: {
							type: 'String',
						},
					},
				},
			],
		})

		const rootClient = getGraphqlClient(wabe.config.port)

		const result1 = await rootClient.request<any>(gql`
			mutation createTestClass1 {
				createTestClass1(input: { fields: { field1: { createAndAdd: [{ field2: "field2" }] } } }) {
					testClass1 {
						id
					}
				}
			}
		`)

		const result2 = await rootClient.request<any>(gql`
      query testClass1 {
          testClass1(id: "${result1.createTestClass1.testClass1.id}") {
            field1 {
            edges {
                node {
                field2
                }
             }
            }
          }
      }
      `)

		expect(result2.testClass1.field1.edges[0].node.field2).toBe('field2')

		await wabe.close()
	})

	it('should have FileInput input on Create and Update fields input when we use a File field', async () => {
		const { wabe } = await createWabe({
			classes: [
				{
					name: 'TestClass',
					fields: {
						file: {
							type: 'File',
							required: true,
						},
					},
				},
			],
		})

		expect(
			getTypeFromGraphQLSchema({
				schema: wabe.config.graphqlSchema || ({} as any),
				type: 'Type',
				name: 'TestClassCreateFieldsInput',
			}).input.file,
		).toEqual('FileInput!')

		expect(
			getTypeFromGraphQLSchema({
				schema: wabe.config.graphqlSchema || ({} as any),
				type: 'Type',
				name: 'TestClassUpdateFieldsInput',
			}).input.file,
		).toEqual('FileInput!')

		await wabe.close()
	})

	it('should have FileInfo object on the wabe object when we use a File field', async () => {
		const { wabe } = await createWabe({
			classes: [
				{
					name: 'TestClass',
					fields: {
						file: {
							type: 'File',
							required: true,
						},
					},
				},
			],
		})

		expect(
			getTypeFromGraphQLSchema({
				schema: wabe.config.graphqlSchema || ({} as any),
				type: 'Type',
				name: 'TestClass',
			}).input.file,
		).toEqual('FileInfo!')

		await wabe.close()
	})

	it('should be able to create a phone field that check correctly if the phone is valid across the world', async () => {
		const { client, wabe } = await createWabe({
			classes: [
				{
					name: 'TestClass',
					fields: {
						phone: {
							type: 'Phone',
						},
					},
				},
			],
		})

		// French mobile valid
		await client.request<any>(gql`
			mutation createTestClass {
				createTestClass(input: { fields: { phone: "+33612345678" } }) {
					testClass {
						phone
					}
				}
			}
		`)

		// USA californian valid
		await client.request<any>(gql`
			mutation createTestClass {
				createTestClass(input: { fields: { phone: "+14155552671" } }) {
					testClass {
						phone
					}
				}
			}
		`)

		// Brasil mobile valid
		await client.request<any>(gql`
			mutation createTestClass {
				createTestClass(input: { fields: { phone: "+5511998765432" } }) {
					testClass {
						phone
					}
				}
			}
		`)

		// French mobile not valid
		expect(
			client.request<any>(gql`
				mutation createTestClass {
					createTestClass(input: { fields: { phone: "+3361234578" } }) {
						testClass {
							phone
						}
					}
				}
			`),
		).rejects.toThrow('Expected value of type "Phone", found "+3361234578"')

		// USA californian not valid
		expect(
			client.request<any>(gql`
				mutation createTestClass {
					createTestClass(input: { fields: { phone: "+1415555267" } }) {
						testClass {
							phone
						}
					}
				}
			`),
		).rejects.toThrow('Expected value of type "Phone", found "+1415555267"')

		// Brasil mobile not valid
		expect(
			client.request<any>(gql`
				mutation createTestClass {
					createTestClass(input: { fields: { phone: "+5511234567" } }) {
						testClass {
							phone
						}
					}
				}
			`),
		).rejects.toThrow('Expected value of type "Phone", found "+5511234567"')

		await wabe.close()
	})

	it('should be able to create an array in an object', async () => {
		const { wabe } = await createWabe({
			classes: [
				{
					name: 'TestClass',
					fields: {
						field1: {
							type: 'Array',
							typeValue: 'Object',
							object: {
								name: 'SubObject',
								fields: {
									field2: {
										type: 'Array',
										typeValue: 'String',
										required: true,
										requiredValue: false,
									},
									field3: { type: 'Int' },
								},
							},
						},
					},
				},
			],
		})

		expect(
			getTypeFromGraphQLSchema({
				schema: wabe.config.graphqlSchema || ({} as any),
				type: 'Type',
				name: 'TestClassSubObject',
			}).input,
		).toEqual({
			field2: '[String]!',
			field3: 'Int',
		})

		await wabe.close()
	})

	// It is useful when we have the permission to create but not to read the data
	// We should be able to create a new object without return any data
	// Just use the "ok" field
	it('should be able to create a new object with mutation without return any data', async () => {
		const { wabe } = await createWabe({
			classes: [
				{
					name: 'TestClass',
					fields: {
						name: {
							type: 'String',
						},
					},
					permissions: {
						// Anyone can create a new object
						create: {
							requireAuthentication: false,
						},
						// No one can read the data
						read: {
							authorizedRoles: [],
							requireAuthentication: true,
						},
					},
				},
			],
		})

		const anonymousClient = getAnonymousClient(wabe.config.port)

		const res = await anonymousClient.request<any>(
			gql`
				mutation createTestClass {
					createTestClass(input: { fields: { name: "A" } }) {
						ok
					}
				}
			`,
			{},
		)

		expect(res.createTestClass.ok).toBe(true)

		await wabe.close()
	})

	it('should be able to update an object with mutation without return any data', async () => {
		const { client, wabe } = await createWabe({
			classes: [
				{
					name: 'TestClass',
					fields: {
						name: {
							type: 'String',
						},
					},
					permissions: {
						// Anyone can create a new object
						create: {
							requireAuthentication: false,
						},
						update: {
							requireAuthentication: false,
						},
						// No one can read the data
						read: {
							authorizedRoles: [],
							requireAuthentication: true,
						},
					},
				},
			],
		})

		const res = await client.request<any>(
			gql`
				mutation createTestClass {
					createTestClass(input: { fields: { name: "A" } }) {
						testClass {
							id
						}
					}
				}
			`,
			{},
		)

		const anonymousClient = getAnonymousClient(wabe.config.port)

		const res2 = await anonymousClient.request<any>(
			gql`
          mutation updateTestClass {
              updateTestClass(
              input: {
                fields: { name: "A" },
                id: "${res.createTestClass.testClass.id}"
              }
            ) {
              ok
            }
          }
        `,
			{},
		)

		expect(res2.updateTestClass.ok).toBe(true)

		await wabe.close()
	})

	it('should be able to delete an object with mutation without return any data', async () => {
		const { client, wabe } = await createWabe({
			classes: [
				{
					name: 'TestClass',
					fields: {
						name: {
							type: 'String',
						},
					},
					permissions: {
						create: {
							requireAuthentication: false,
						},
						delete: {
							requireAuthentication: false,
						},
					},
				},
			],
		})

		const res = await client.request<any>(
			gql`
				mutation createTestClass {
					createTestClass(input: { fields: { name: "A" } }) {
						testClass {
							id
						}
					}
				}
			`,
			{},
		)

		const anonymousClient = getAnonymousClient(wabe.config.port)

		const res2 = await anonymousClient.request<any>(
			gql`
          mutation deleteTestClass {
              deleteTestClass(
              input: {
                id: "${res.createTestClass.testClass.id}"
              }
            ) {
              ok
            }
          }
        `,
			{},
		)

		expect(res2.deleteTestClass.ok).toBe(true)

		await wabe.close()
	})

	it('should order the element in the query by name and age ASC using order enum', async () => {
		const { client, wabe } = await createWabe({
			classes: [
				{
					name: 'TestClass',
					fields: {
						name: {
							type: 'String',
						},
						age: {
							type: 'Int',
						},
					},
				},
			],
		})

		await client.request<any>(
			gql`
				mutation createTestClasses {
					createTestClasses(
						input: {
							fields: [
								{ name: "A", age: 20 }
								{ name: "B", age: 19 }
								{ name: "C", age: 18 }
								{ name: "D", age: 17 }
							]
						}
					) {
						edges {
							node {
								name
							}
						}
					}
				}
			`,
			{},
		)

		const res = await client.request<any>(
			gql`
				query testClasses {
					testClasses(order: [name_DESC, age_ASC]) {
						edges {
							node {
								name
							}
						}
					}
				}
			`,
			{},
		)

		expect(res.testClasses.edges[0].node.name).toBe('D')
		expect(res.testClasses.edges[1].node.name).toBe('C')
		expect(res.testClasses.edges[2].node.name).toBe('B')
		expect(res.testClasses.edges[3].node.name).toBe('A')

		await wabe.close()
	})

	it('should order the element in the query by name ASC using order enum', async () => {
		const { client, wabe } = await createWabe({
			classes: [
				{
					name: 'TestClass',
					fields: {
						name: {
							type: 'String',
						},
					},
				},
			],
		})

		await client.request<any>(
			gql`
				mutation createTestClasses {
					createTestClasses(
						input: { fields: [{ name: "test1" }, { name: "test2" }, { name: "test3" }, { name: "test4" }] }
					) {
						edges {
							node {
								name
							}
						}
					}
				}
			`,
			{},
		)

		const res = await client.request<any>(
			gql`
				query testClasses {
					testClasses(where: { name: { equalTo: "test1" } }, order: [name_ASC]) {
						edges {
							node {
								name
							}
						}
					}
				}
			`,
			{},
		)

		expect(res.testClasses.edges[0].node.name).toBe('test1')

		await wabe.close()
	})

	it('should use the searchUsers to search all testClasses for corresponding term', async () => {
		const { client, wabe } = await createWabe({
			classes: [
				{
					name: 'TestClass',
					fields: {
						name: {
							type: 'String',
						},
						age: {
							type: 'Int',
						},
					},
					searchableFields: ['name'],
				},
			],
		})

		await client.request<any>(
			gql`
				mutation createTestClass {
					createTestClass(input: { fields: { name: "test", age: 30 } }) {
						testClass {
							name
						}
					}
				}
			`,
			{},
		)

		const res = await client.request<any>(gql`
			query testClasses {
				testClasses(where: { AND: [{ age: { equalTo: 30 } }, { search: { contains: "t" } }] }) {
					totalCount
				}
			}
		`)

		expect(res.testClasses.totalCount).toEqual(1)

		const res2 = await client.request<any>(gql`
			query testClasses {
				testClasses(where: { search: { contains: "invalid" } }) {
					totalCount
				}
			}
		`)

		expect(res2.testClasses.totalCount).toEqual(0)

		const res3 = await client.request<any>(gql`
			query testClasses {
				testClasses(where: { search: { contains: "test" } }) {
					totalCount
				}
			}
		`)

		expect(res3.testClasses.totalCount).toEqual(1)

		const res4 = await client.request<any>(gql`
			query testClasses {
				testClasses(where: { AND: [{ age: { equalTo: 1111 } }, { search: { contains: "test" } }] }) {
					totalCount
				}
			}
		`)

		expect(res4.testClasses.totalCount).toEqual(0)

		const res5 = await client.request<any>(gql`
			query testClasses {
				testClasses(where: { AND: [{ age: { equalTo: 30 } }, { search: { contains: "" } }] }) {
					totalCount
				}
			}
		`)

		expect(res5.testClasses.totalCount).toEqual(1)

		await wabe.close()
	})

	it('should contain totalCount elements in query multiple objects', () => {
		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Type',
				name: 'TestClassConnection',
			}).input.totalCount,
		).toEqual('Int')
	})

	it('should totalCount all elements corresponding to where object', async () => {
		const { client, wabe } = await createWabe({
			classes: [
				{
					name: 'TestClass',
					fields: {
						field1: {
							type: 'Object',
							object: {
								name: 'SubObject',
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
					createTestClass(input: { fields: { field1: { field2: "test", field3: 1 } } }) {
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

		const res = await client.request<any>(gql`
			query testClasses {
				testClasses {
					totalCount
				}
			}
		`)

		expect(res.testClasses.totalCount).toEqual(1)

		await wabe.close()
	})

	it('should request an object with pointer in same class (issue #5)', async () => {
		const { client, wabe } = await createWabe({
			classes: [],
		})

		await client.request<any>(gql`
			mutation createOnboarding {
				createUser(
					input: {
						fields: {
							authentication: { emailPassword: { email: "test@gmail.com", password: "password" } }
						}
					}
				) {
					user {
						email
					}
				}
			}
		`)

		const res = await client.request<any>(gql`
			query users {
				users {
					edges {
						node {
							authentication {
								emailPassword {
									email
									password
								}
							}
						}
					}
				}
			}
		`)

		expect(res.users.edges[0].node.authentication.emailPassword).toEqual({
			email: 'test@gmail.com',
			password: expect.any(String),
		})

		await wabe.close()
	})

	it('should support custom output types for queries and mutations', () => {
		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Query',
				name: 'queryWithCustomTypes',
			}).output,
		).toEqual('[TestQuery!]!')

		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Mutation',
				name: 'mutationWithCustomTypes',
			}).output,
		).toEqual('[TestMutation!]!')
	})

	it('should have required field on object fields', () => {
		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Type',
				name: 'TestClassRequired',
			}).input.field7,
		).toEqual('String!')

		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Type',
				name: 'TestClassRequired',
			}).input.field8,
		).toEqual('[Int!]!')

		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Type',
				name: 'TestClassRequired',
			}).input.field9,
		).toEqual('[TestClassRequiredTestObjectArray]!')
	})

	it('should support object of array of object', () => {
		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Type',
				name: 'TestClass2',
			}).input.field1,
		).toEqual('TestClass2TestObject!')

		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Type',
				name: 'TestClass2TestObject',
			}).input.testSubObject,
		).toEqual('[TestClass2TestObjectFieldsObject!]!')

		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Type',
				name: 'TestClass2TestObjectFieldsObject',
			}).input,
		).toEqual({ name: 'String!' })
	})

	it('should support an array of object in graphql schema', async () => {
		const { client, wabe } = await createWabe({
			classes: [
				{
					name: 'TestClass',
					fields: {
						field1: {
							type: 'Array',
							typeValue: 'Object',
							object: {
								name: 'Field1Object',
								fields: {
									name: {
										type: 'String',
									},
								},
							},
						},
					},
				},
			],
		})

		const res = await client.request<any>(gql`
			mutation createTestClass {
				createTestClass(input: { fields: { field1: [{ name: "test" }, { name: "test2" }] } }) {
					testClass {
						id
						field1 {
							name
						}
					}
				}
			}
		`)

		expect(res.createTestClass.testClass.field1).toEqual([{ name: 'test' }, { name: 'test2' }])

		await wabe.close()
	})

	it('should return an array in a query', async () => {
		const { client, wabe } = await createWabe({
			classes: [
				{
					name: 'TestClass',
					fields: {
						field1: {
							type: 'String',
						},
					},
				},
			],
			resolvers: {
				queries: {
					testQuery: {
						resolve: () => {
							return ['test']
						},
						type: 'Array',
						typeValue: 'String',
					},
				},
			},
		})

		const res = await client.request<any>(gql`
			query testQuery {
				testQuery
			}
		`)

		expect(res.testQuery).toEqual(['test'])

		await wabe.close()
	})

	it('should return an object in a query', async () => {
		const { client, wabe } = await createWabe({
			classes: [
				{
					name: 'TestClass',
					fields: {
						field1: {
							type: 'String',
						},
					},
				},
			],
			resolvers: {
				queries: {
					testQuery: {
						resolve: () => {
							return { test: 'test' }
						},
						type: 'Object',
						outputObject: {
							name: 'TestQueryOutput',
							fields: {
								test: {
									type: 'String',
								},
							},
						},
					},
				},
			},
		})

		const res = await client.request<any>(gql`
			query testQuery {
				testQuery {
					test
				}
			}
		`)

		expect(res.testQuery.test).toEqual('test')

		await wabe.close()
	})

	it('should return an array in a mutation', async () => {
		const { client, wabe } = await createWabe({
			classes: [
				{
					name: 'TestClass',
					fields: {
						field1: {
							type: 'String',
						},
					},
				},
			],
			resolvers: {
				mutations: {
					testMutation: {
						resolve: () => {
							return ['test']
						},
						type: 'Array',
						typeValue: 'String',
					},
				},
			},
		})

		const res = await client.request<any>(gql`
			mutation testMutation {
				testMutation
			}
		`)

		expect(res.testMutation).toEqual(['test'])

		await wabe.close()
	})

	it('should return an object in a mutation', async () => {
		const { client, wabe } = await createWabe({
			classes: [
				{
					name: 'TestClass',
					fields: {
						field1: {
							type: 'String',
						},
					},
				},
			],
			resolvers: {
				mutations: {
					testMutation: {
						resolve: () => {
							return { test: 'test' }
						},
						type: 'Object',
						outputObject: {
							name: 'TestMutationOutput',
							fields: {
								test: {
									type: 'String',
								},
							},
						},
					},
				},
			},
		})

		const res = await client.request<any>(gql`
			mutation testMutation {
				testMutation {
					test
				}
			}
		`)

		expect(res.testMutation.test).toEqual('test')

		await wabe.close()
	})

	it('should have a custom enum as value in type', async () => {
		const { client, wabe } = await createWabe({
			classes: [
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

		await wabe.close()
	})

	it('should have correct WhereInput object', () => {
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
			acl: 'TestClassACLObjectWhereInput',
			createdAt: 'DateWhereInput',
			updatedAt: 'DateWhereInput',
			search: 'SearchWhereInput',
		})
	})

	it('should resolve virtual fields in GraphQL queries', async () => {
		const { client, wabe } = await createWabe({
			classes: [
				{
					name: 'VirtualPerson',
					fields: {
						firstName: { type: 'String' },
						lastName: { type: 'String' },
						age: { type: 'Int' },
						fullName: {
							type: 'Virtual',
							returnType: 'String',
							// @ts-expect-error
							dependsOn: ['firstName', 'lastName'],
							callback: (object: any) =>
								`${object.firstName || ''} ${object.lastName || ''}`.trim(),
						},
						isAdult: {
							type: 'Virtual',
							returnType: 'Boolean',
							// @ts-expect-error
							dependsOn: ['age'],
							callback: (object: any) => (object.age || 0) >= 18,
						},
					},
					permissions: {
						read: { requireAuthentication: false },
						create: { requireAuthentication: false },
						update: { requireAuthentication: false },
						delete: { requireAuthentication: false },
					},
				},
			],
		})

		const created = await client.request<{
			createVirtualPerson: {
				virtualPerson: {
					id: string
				}
			}
		}>(gql`
			mutation createVirtualPerson {
				createVirtualPerson(input: { fields: { firstName: "Ada", lastName: "Lovelace", age: 37 } }) {
					virtualPerson {
						id
					}
				}
			}
		`)

		const read = await client.request<{
			virtualPerson: {
				id: string
				firstName: string
				lastName: string
				age: number
				fullName: string
				isAdult: boolean
			}
		}>(
			gql`
				query virtualPerson($id: ID) {
					virtualPerson(id: $id) {
						id
						firstName
						lastName
						age
						fullName
						isAdult
					}
				}
			`,
			{ id: created.createVirtualPerson.virtualPerson.id },
		)

		expect(read.virtualPerson.id).toBe(created.createVirtualPerson.virtualPerson.id)
		expect(read.virtualPerson.firstName).toBe('Ada')
		expect(read.virtualPerson.lastName).toBe('Lovelace')
		expect(read.virtualPerson.age).toBe(37)
		expect(read.virtualPerson.fullName).toBe('Ada Lovelace')
		expect(read.virtualPerson.isAdult).toBe(true)

		const list = await client.request<{
			virtualPersons: {
				edges: Array<{
					node: {
						fullName: string
						isAdult: boolean
					}
				}>
			}
		}>(gql`
			query virtualPersons {
				virtualPersons {
					edges {
						node {
							fullName
							isAdult
						}
					}
				}
			}
		`)

		expect(list.virtualPersons.edges[0]?.node.fullName).toBe('Ada Lovelace')
		expect(list.virtualPersons.edges[0]?.node.isAdult).toBe(true)

		await wabe.close()
	})

	it('should resolve virtual field returning array in GraphQL queries', async () => {
		const { client, wabe } = await createWabe({
			classes: [
				{
					name: 'VirtualPersonWithArray',
					fields: {
						firstName: { type: 'String' },
						lastName: { type: 'String' },
						nameParts: {
							type: 'Virtual',
							returnType: 'Array',
							typeValue: 'String',
							// @ts-expect-error
							dependsOn: ['firstName', 'lastName'],
							callback: (object: any) =>
								[object.firstName || '', object.lastName || ''].filter(Boolean),
						},
					},
					permissions: {
						read: { requireAuthentication: false },
						create: { requireAuthentication: false },
						update: { requireAuthentication: false },
						delete: { requireAuthentication: false },
					},
				},
			],
		})

		const created = await client.request<{
			createVirtualPersonWithArray: {
				virtualPersonWithArray: { id: string }
			}
		}>(gql`
			mutation createVirtualPersonWithArray {
				createVirtualPersonWithArray(input: { fields: { firstName: "Ada", lastName: "Lovelace" } }) {
					virtualPersonWithArray {
						id
					}
				}
			}
		`)

		const read = await client.request<{
			virtualPersonWithArray: {
				id: string
				firstName: string
				lastName: string
				nameParts: string[]
			}
		}>(
			gql`
				query virtualPersonWithArray($id: ID) {
					virtualPersonWithArray(id: $id) {
						id
						firstName
						lastName
						nameParts
					}
				}
			`,
			{ id: created.createVirtualPersonWithArray.virtualPersonWithArray.id },
		)

		expect(read.virtualPersonWithArray.nameParts).toEqual(['Ada', 'Lovelace'])

		await wabe.close()
	})

	it('should resolve virtual field returning array of objects in GraphQL queries', async () => {
		const { client, wabe } = await createWabe({
			classes: [
				{
					name: 'VirtualPersonWithObjectArray',
					fields: {
						firstName: { type: 'String' },
						lastName: { type: 'String' },
						nameInfos: {
							type: 'Virtual',
							returnType: 'Array',
							typeValue: 'Object',
							object: {
								name: 'NameInfo',
								fields: {
									label: { type: 'String' },
									value: { type: 'String' },
								},
							},
							// @ts-expect-error
							dependsOn: ['firstName', 'lastName'],
							callback: (object: any) => [
								{ label: 'First', value: object.firstName || '' },
								{ label: 'Last', value: object.lastName || '' },
							],
						},
					},
					permissions: {
						read: { requireAuthentication: false },
						create: { requireAuthentication: false },
						update: { requireAuthentication: false },
						delete: { requireAuthentication: false },
					},
				},
			],
		})

		const created = await client.request<{
			createVirtualPersonWithObjectArray: {
				virtualPersonWithObjectArray: { id: string }
			}
		}>(gql`
			mutation createVirtualPersonWithObjectArray {
				createVirtualPersonWithObjectArray(input: { fields: { firstName: "Grace", lastName: "Hopper" } }) {
					virtualPersonWithObjectArray {
						id
					}
				}
			}
		`)

		const read = await client.request<{
			virtualPersonWithObjectArray: {
				id: string
				nameInfos: Array<{ label: string; value: string }>
			}
		}>(
			gql`
				query virtualPersonWithObjectArray($id: ID) {
					virtualPersonWithObjectArray(id: $id) {
						id
						nameInfos {
							label
							value
						}
					}
				}
			`,
			{ id: created.createVirtualPersonWithObjectArray.virtualPersonWithObjectArray.id },
		)

		expect(read.virtualPersonWithObjectArray.nameInfos).toEqual([
			{ label: 'First', value: 'Grace' },
			{ label: 'Last', value: 'Hopper' },
		])

		await wabe.close()
	})

	it('should have ConnectionObject on field of relation in ObjectType', () => {
		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Type',
				name: 'FifthClass',
			}).input.relation,
		).toEqual('SixthClassConnection')
	})

	it('should have a TestClassRelationInput', () => {
		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Type',
				name: 'TestClassRelationInput',
			}).input.createAndAdd,
		).toEqual('[TestClassCreateFieldsInput!]')
	})

	it('should have a RelationInput on SixthClass on field relation of FifthClass', () => {
		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Type',
				name: 'FifthClassInput',
			}).input.relation,
		).toEqual('SixthClassRelationInput')
	})

	it('should have the pointer in the object when there is a circular dependency in pointer', () => {
		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Type',
				name: 'ThirdClass',
			}).input.pointer,
		).toEqual('FourthClass')

		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Type',
				name: 'FourthClass',
			}).input.pointer,
		).toEqual('ThirdClass')

		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Type',
				name: 'ThirdClassInput',
			}).input.pointer,
		).toEqual('FourthClassPointerInput')

		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Type',
				name: 'FourthClassInput',
			}).input.pointer,
		).toEqual('ThirdClassPointerInput')

		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Type',
				name: 'ThirdClassPointerInput',
			}).input.createAndLink,
		).toEqual('ThirdClassCreateFieldsInput')

		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Type',
				name: 'FourthClassPointerInput',
			}).input.createAndLink,
		).toEqual('FourthClassCreateFieldsInput')
	})

	it('should have TestClassPointerInput', () => {
		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Type',
				name: 'TestClassPointerInput',
			}).input.createAndLink,
		).toEqual('TestClassCreateFieldsInput')
	})

	it('should have a type with a pointer to TestClass', () => {
		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Type',
				name: 'SecondClass',
			}).input.pointer,
		).toEqual('TestClass')
	})

	it('should have pointer input on SecondClassCreateFieldsInput', () => {
		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Type',
				name: 'SecondClassCreateFieldsInput',
			}).input.pointer,
		).toEqual('TestClassPointerInput')
	})

	it('should have pointer input on SecondClassUpdateFieldsInput', () => {
		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Type',
				name: 'SecondClassUpdateFieldsInput',
			}).input.pointer,
		).toEqual('TestClassPointerInput')
	})

	it('should have ClassCreateInputFieldsInput', () => {
		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Type',
				name: 'TestClassCreateFieldsInput',
			}).input.field1,
		).toEqual('String')
	})

	it('should have ClassUpdateInputFieldsInput', () => {
		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Type',
				name: 'TestClassUpdateFieldsInput',
			}).input.field1,
		).toEqual('String')
	})

	it('should get correct CreateTestClassPaylod type', () => {
		expect(
			getTypeFromGraphQLSchema({
				schema,
				type: 'Type',
				name: 'CreateTestClassPayload',
			}).input,
		).toEqual({
			ok: 'Boolean',
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
				first: 'Int',
				offset: 'Int',
				where: 'TestClassWhereInput',
				order: '[TestClassOrder!]',
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
			input: { input: 'CreateTestClassInput!' },
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
			input: { input: 'CreateTestClassesInput!' },
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
			input: { input: 'UpdateTestClassInput!' },
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
			input: { input: 'UpdateTestClassesInput!' },
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
			input: { input: 'DeleteTestClassInput!' },
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
			input: { input: 'DeleteTestClassesInput!' },
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
		const { client, wabe } = await createWabe({
			classes: [
				{
					name: 'TestClass',
					fields: { field1: { type: 'String' } },
				},
			],
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
						resolve: (_: any, args: any) => args.input.sum.a + args.input.sum.b,
					},
				},
			},
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

		await wabe.close()
	})

	it('should create mutation with sub sub input', async () => {
		const { client, wabe } = await createWabe({
			classes: [
				{
					name: 'TestClass',
					fields: { field1: { type: 'String' } },
				},
			],
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
								},
							},
						},
						resolve: (_: any, args: any) => args.input.subObject.sum.a + args.input.subObject.sum.b,
					},
				},
			},
		})

		const request = await client.request<any>(
			gql`
				mutation customMutation {
					customMutation(input: { subObject: { sum: { a: 1, b: 2 } } })
				}
			`,
			{},
		)

		expect(request.customMutation).toBe(3)

		await wabe.close()
	})

	it('should create custom mutation with sub object and correct input name', async () => {
		const { client, wabe } = await createWabe({
			classes: [
				{
					name: 'TestClass',
					fields: { field1: { type: 'String' } },
				},
			],
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
						resolve: (_: any, args: any) => args.input.sum.a + args.input.sum.b,
					},
				},
			},
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

		await wabe.close()
	})

	it('should create a sub object with the good type', async () => {
		const { client, wabe } = await createWabe({
			classes: [
				{
					name: 'TestClass',
					fields: {
						field1: {
							type: 'Object',
							object: {
								name: 'SubObject',
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
					createTestClass(input: { fields: { field1: { field2: "test", field3: 1 } } }) {
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
				query testClasses($field1WhereInput: TestClassSubObjectWhereInput) {
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

		await wabe.close()
	})

	it('should create an object with a pointer (createAndLink)', async () => {
		const { client, wabe } = await createWabe({
			classes: [
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
						input: { fields: { name: "name", field2: { createAndLink: { field1: "field1" } } } }
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

		await wabe.close()
	})

	it('should link an object to a pointer', async () => {
		const { client, wabe } = await createWabe({
			classes: [
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

		await wabe.close()
	})

	it('should link a pointer on create multiple object', async () => {
		const { client, wabe } = await createWabe({
			classes: [
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
						input: { fields: [{ name: "name", field2: { createAndLink: { field1: "field1" } } }] }
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

		await wabe.close()
	})

	it('should filter an object (on query) with pointer field', async () => {
		const { client, wabe } = await createWabe({
			classes: [
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
						input: { fields: { name: "name", field2: { createAndLink: { field1: "field1" } } } }
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

		const queryRes = await client.request<any>(gql`
			query testClass2s {
				testClass2s(where: { field2: { field1: { equalTo: "field1" } } }) {
					edges {
						node {
							name
						}
					}
				}
			}
		`)

		expect(queryRes.testClass2s.edges.length).toBe(1)
		expect(queryRes.testClass2s.edges[0].node.name).toBe('name')

		await wabe.close()
	})

	it('should filter an object (on updates) with pointer field', async () => {
		const { client, wabe } = await createWabe({
			classes: [
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
						input: { fields: { name: "name", field2: { createAndLink: { field1: "field1" } } } }
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

		const updateRes = await client.request<any>(gql`
			mutation updateTestClass2s {
				updateTestClass2s(
					input: { fields: { name: "name2" }, where: { field2: { field1: { equalTo: "field1" } } } }
				) {
					edges {
						node {
							name
						}
					}
				}
			}
		`)

		expect(updateRes.updateTestClass2s.edges.length).toBe(1)
		expect(updateRes.updateTestClass2s.edges[0].node.name).toBe('name2')

		await wabe.close()
	})

	it('should filter an object (on deletes) with pointer field', async () => {
		const { client, wabe } = await createWabe({
			classes: [
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
						input: { fields: { name: "name", field2: { createAndLink: { field1: "field1" } } } }
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

		const deleteRes = await client.request<any>(gql`
			mutation deleteTestClass2s {
				deleteTestClass2s(input: { where: { field2: { field1: { equalTo: "field1" } } } }) {
					edges {
						node {
							name
						}
					}
				}
			}
		`)

		expect(deleteRes.deleteTestClass2s.edges.length).toBe(1)
		expect(deleteRes.deleteTestClass2s.edges[0].node.name).toBe('name')

		await wabe.close()
	})

	it('should create and link a pointer on update', async () => {
		const { client, wabe } = await createWabe({
			classes: [
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
						input: { fields: { name: "name", field2: { createAndLink: { field1: "field1" } } } }
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
		expect(resAfterUpdate.updateTestClass2.testClass2.field2.field1).toBe('field1AfterUpdate')

		await wabe.close()
	})

	it('should link a pointer on update', async () => {
		const { client, wabe } = await createWabe({
			classes: [
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
		expect(resAfterUpdate.updateTestClass2.testClass2.field2.field1).toBe('field1')

		await wabe.close()
	})

	it('should unlink a pointer on update', async () => {
		const { client, wabe } = await createWabe({
			classes: [
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
					createTestClass2(input: { fields: { name: "name", field2: { link : "${idOfTestClass}"} }}) {
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

		expect(res.createTestClass2.testClass2.field2.field1).toBe('field1')

		const res2 = await client.request<any>(
			gql`
				mutation updateTestClass2 {
					updateTestClass2(input: {
  					id: "${res.createTestClass2.testClass2.id}"
  					fields: {
   				     field2: { unlink: true }
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

		expect(res2.updateTestClass2.testClass2.field2).toBeNull()

		await wabe.close()
	})

	it('should link a pointer on update multiple object', async () => {
		const { client, wabe } = await createWabe({
			classes: [
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
					createTestClass2s(input: { fields: [{ name: "name" }, { name: "name2" }] }) {
						edges {
							node {
								name
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
							fields: { field2: { createAndLink: { field1: "field1UpdateMultiple" } } }
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
		expect(resAfterUpdate.updateTestClass2s.edges[0].node.field2.field1).toBe(
			'field1UpdateMultiple',
		)

		await wabe.close()
	})

	it('should return pointer data on delete an element', async () => {
		const { client, wabe } = await createWabe({
			classes: [
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
						input: { fields: { name: "name", field2: { createAndLink: { field1: "field1" } } } }
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
		expect(resAfterDelete.deleteTestClass2.testClass2.field2.field1).toBe('field1')

		await wabe.close()
	})

	it('should createAndAdd an object on a relation field (on create)', async () => {
		const { client, wabe } = await createWabe({
			classes: [
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
							field2: { createAndAdd: [{ field1: "field1" }, { field1: "field2" }] }
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

		const field2AfterUpdate1 = (await wabe.controllers.database.getObjects({
			// @ts-expect-error
			className: 'TestClass2',
			context: {
				wabe,
				isRoot: true,
			},
		})) as any

		expect(field2AfterUpdate1[0]?.field2.length).toBe(2)

		expect(res.createTestClass2.testClass2.name).toBe('name')
		expect(res.createTestClass2.testClass2.field2.edges[0].node.field1).toBe('field1')

		await wabe.close()
	})

	it('should add an object on a relation field (on create)', async () => {
		const { client, wabe } = await createWabe({
			classes: [
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
		expect(resAfterAdd.createTestClass2.testClass2.field2.edges[0].node.field1).toBe('field1')

		await wabe.close()
	})

	it('should createAndAdd an object on a relation field (on createMany)', async () => {
		const { client, wabe } = await createWabe({
			classes: [
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
					input: { fields: [{ name: "name", field2: { createAndAdd: [{ field1: "field1" }] } }] }
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
		expect(res.createTestClass2s.edges[0].node.field2.edges[0].node.field1).toBe('field1')

		await wabe.close()
	})

	it('should add an object on a relation field (on createMany)', async () => {
		const { client, wabe } = await createWabe({
			classes: [
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
		expect(resAfterAdd.createTestClass2s.edges[0].node.field2.edges[0].node.field1).toBe('field1')

		await wabe.close()
	})

	it('should createAndAdd an object on a relation field (on update)', async () => {
		const { client, wabe } = await createWabe({
			classes: [
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
		expect(resAfterUpdate.updateTestClass2.testClass2.field2.edges[0].node.field1).toBe('field1')

		await wabe.close()
	})

	it('should add an object on a relation field (on update)', async () => {
		const { client, wabe } = await createWabe({
			classes: [
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

		const res2 = await client.request<any>(gql`
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

		await client.request<any>(gql`
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

		const field2AfterUpdate1 = (await wabe.controllers.database.getObjects({
			// @ts-expect-error
			className: 'TestClass2',
			context: {
				wabe,
				isRoot: true,
			},
		})) as any

		expect(field2AfterUpdate1[0]?.field2.length).toBe(1)

		const resAfterUpdate2 = await client.request<any>(gql`
    	mutation updateTestClass2 {
    		updateTestClass2(
    			input: {
    				id: "${resAfterAdd.createTestClass2.testClass2.id}"
    				fields: {
    					field2: { add: ["${res2.createTestClass.testClass.id}"] }
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

		const field2AfterUpdate2 = (await wabe.controllers.database.getObjects({
			// @ts-expect-error
			className: 'TestClass2',
			context: {
				wabe,
				isRoot: true,
			},
			// @ts-expect-error
			select: { field2: true },
		})) as any

		expect(field2AfterUpdate2[0].field2).toEqual([
			{ id: res.createTestClass.testClass.id },
			{ id: res2.createTestClass.testClass.id },
		])
		expect(field2AfterUpdate2[0]?.field2.length).toBe(2)

		expect(resAfterUpdate2.updateTestClass2.testClass2.name).toBe('name')
		expect(resAfterUpdate2.updateTestClass2.testClass2.field2.edges.length).toBe(2)
		expect(resAfterUpdate2.updateTestClass2.testClass2.field2.edges[0].node.field1).toBe('field1')

		await wabe.close()
	})

	it('should remove an object on a relation field (on update)', async () => {
		const { client, wabe } = await createWabe({
			classes: [
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
					input: { fields: { name: "name", field2: { createAndAdd: [{ field1: "field1" }] } } }
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
  							   id
  							}
							}
						}
					}
				}
			}
		`)

		expect(resAfterUpdate.updateTestClass2.testClass2.name).toBe('name')
		expect(resAfterUpdate.updateTestClass2.testClass2.field2.edges.length).toEqual(0)

		await wabe.close()
	})

	it('should createAndAdd an object on a relation field (on updateMany)', async () => {
		const { client, wabe } = await createWabe({
			classes: [
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
		expect(resAfterUpdate.updateTestClass2s.edges[0].node.field2.edges[0].node.field1).toBe(
			'field1',
		)

		await wabe.close()
	})

	it('should add an object on a relation field (on updateMany)', async () => {
		const { client, wabe } = await createWabe({
			classes: [
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

		const res2 = await client.request<any>(gql`
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

		await client.request<any>(gql`
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

		const resAfterUpdate = await client.request<any>(gql`
			mutation updateTestClass2s {
				updateTestClass2s(
					input: {
						where: {id: {equalTo: "${resAfterAdd.createTestClass2.testClass2.id}"}}
						fields: {
							field2: { add: ["${res2.createTestClass.testClass.id}"] }
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

		const field2AfterUpdate2 = (await wabe.controllers.database.getObjects({
			// @ts-expect-error
			className: 'TestClass2',
			context: {
				wabe,
				isRoot: true,
			},
			// @ts-expect-error
			select: { field2: true },
		})) as any

		expect(field2AfterUpdate2[0]?.field2.length).toBe(2)
		expect(field2AfterUpdate2[0]?.field2).toEqual([
			{ id: res.createTestClass.testClass.id },
			{ id: res2.createTestClass.testClass.id },
		])

		expect(resAfterUpdate.updateTestClass2s.edges[0].node.name).toBe('name')
		expect(resAfterUpdate.updateTestClass2s.edges[0].node.field2.edges[0].node.field1).toBe(
			'field1',
		)

		await wabe.close()
	})

	it('should remove an object on a relation field (on updateMany)', async () => {
		const { client, wabe } = await createWabe({
			classes: [
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
					input: { fields: { name: "name", field2: { createAndAdd: [{ field1: "field1" }] } } }
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

		const field2BeforeUpdate2 = (await wabe.controllers.database.getObjects({
			// @ts-expect-error
			className: 'TestClass2',
			context: {
				wabe,
				isRoot: true,
			},
			// @ts-expect-error
			select: { field2: true },
		})) as any

		expect(field2BeforeUpdate2[0]?.field2).toEqual([
			{
				id: resAfterAdd.createTestClass2.testClass2.field2.edges[0].node.id,
			},
		])

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

		const field2AfterUpdate2 = (await wabe.controllers.database.getObjects({
			// @ts-expect-error
			className: 'TestClass2',
			context: {
				wabe,
				isRoot: true,
			},
		})) as any

		expect(field2AfterUpdate2[0]?.field2).toEqual([])

		expect(resAfterUpdate.updateTestClass2s.edges[0].node.name).toBe('name')
		expect(resAfterUpdate.updateTestClass2s.edges[0].node.field2.edges.length).toBe(0)

		const resAfterRemove = await client.request<any>(gql`
			query testClasses {
				testClasses {
					edges {
						node {
							field1
						}
					}
				}
			}
		`)

		expect(resAfterRemove.testClasses.edges.length).toBe(0)

		await wabe.close()
	})

	it('should remove an object on a relation field (on update)', async () => {
		const { client, wabe } = await createWabe({
			classes: [
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
					input: { fields: { name: "name", field2: { createAndAdd: [{ field1: "field1" }] } } }
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
					testClass2{
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

		const field2AfterUpdate2 = (await wabe.controllers.database.getObjects({
			// @ts-expect-error
			className: 'TestClass2',
			context: {
				wabe,
				isRoot: true,
			},
		})) as any

		expect(field2AfterUpdate2[0]?.field2.length).toBe(0)

		expect(resAfterUpdate.updateTestClass2.testClass2.name).toBe('name')
		expect(resAfterUpdate.updateTestClass2.testClass2.field2.edges.length).toBe(0)

		const resAfterRemove = await client.request<any>(gql`
			query testClasses {
				testClasses {
					edges {
						node {
							field1
						}
					}
				}
			}
		`)

		expect(resAfterRemove.testClasses.edges.length).toBe(0)

		await wabe.close()
	})

	it('should filter objects where field exists (exists: true)', async () => {
		const { client, wabe } = await createWabe({
			classes: [
				{
					name: 'TestClass',
					fields: {
						name: {
							type: 'String',
						},
						age: {
							type: 'Int',
						},
						active: {
							type: 'Boolean',
						},
					},
				},
			],
		})

		// Create objects with and without the name field
		await client.request<any>(gql`
			mutation createObjects {
				createTestClasses(
					input: {
						fields: [{ name: "Object with name" }, { name: "Another object with name" }, { age: 25 }]
					}
				) {
					ok
				}
			}
		`)

		// Test exists: true - should return only objects with name field
		const res = await client.request<any>(gql`
			query testExistsTrue {
				testClasses(where: { name: { exists: true } }) {
					totalCount
					edges {
						node {
							id
							name
						}
					}
				}
			}
		`)

		expect(res.testClasses.totalCount).toBe(2)
		expect(res.testClasses.edges.length).toBe(2)
		expect(res.testClasses.edges.every((edge: any) => edge.node.name)).toBe(true)

		await wabe.close()
	})

	it('should filter objects where field does not exist (exists: false)', async () => {
		const { client, wabe } = await createWabe({
			classes: [
				{
					name: 'TestClass',
					fields: {
						name: {
							type: 'String',
						},
						age: {
							type: 'Int',
						},
						active: {
							type: 'Boolean',
						},
					},
				},
			],
		})

		// Create objects with and without the name field
		await client.request<any>(gql`
			mutation createObjects {
				createTestClasses(
					input: { fields: [{ name: "Object with name" }, { age: 25 }, { active: true }] }
				) {
					ok
				}
			}
		`)

		// Test exists: false - should return only objects without name field
		const res = await client.request<any>(gql`
			query testExistsFalse {
				testClasses(where: { name: { exists: false } }) {
					totalCount
					edges {
						node {
							id
							name
						}
					}
				}
			}
		`)

		expect(res.testClasses.totalCount).toBe(2)
		expect(res.testClasses.edges.length).toBe(2)
		expect(res.testClasses.edges.every((edge: any) => !edge.node.name)).toBe(true)

		await wabe.close()
	})

	it('should work with AND conditions', async () => {
		const { client, wabe } = await createWabe({
			classes: [
				{
					name: 'TestClass',
					fields: {
						name: {
							type: 'String',
						},
						age: {
							type: 'Int',
						},
						active: {
							type: 'Boolean',
						},
					},
				},
			],
		})
		// Create objects with different field combinations
		await client.request<any>(gql`
			mutation createObjects {
				createTestClasses(
					input: {
						fields: [{ name: "John", age: 25 }, { name: "Jane", age: 30 }, { age: 35 }, { name: "Bob" }]
					}
				) {
					ok
				}
			}
		`)

		// Test with AND condition
		const res = await client.request<any>(gql`
			query testExistsWithAnd {
				testClasses(where: { AND: [{ name: { exists: true } }, { age: { exists: true } }] }) {
					totalCount
					edges {
						node {
							id
							name
							age
						}
					}
				}
			}
		`)

		expect(res.testClasses.totalCount).toBe(2)
		expect(res.testClasses.edges.length).toBe(2)
		expect(res.testClasses.edges.every((edge: any) => edge.node.name && edge.node.age)).toBe(true)

		await wabe.close()
	})

	it('should work with OR conditions', async () => {
		const { client, wabe } = await createWabe({
			classes: [
				{
					name: 'TestClass',
					fields: {
						name: {
							type: 'String',
						},
						age: {
							type: 'Int',
						},
						active: {
							type: 'Boolean',
						},
					},
				},
			],
		})

		// Create objects with different field combinations
		await client.request<any>(gql`
			mutation createObjects {
				createTestClasses(input: { fields: [{ name: "John", age: 25 }, { name: "Jane" }, { age: 30 }] }) {
					ok
				}
			}
		`)

		// Test with OR condition - objects that have either name OR age
		const res = await client.request<any>(gql`
			query testExistsWithOr {
				testClasses(where: { OR: [{ name: { exists: true } }, { age: { exists: true } }] }) {
					totalCount
					edges {
						node {
							id
							name
							age
						}
					}
				}
			}
		`)

		// All 3 objects should match (2 have name, 2 have age, 1 has both)
		expect(res.testClasses.totalCount).toBe(3)
		expect(res.testClasses.edges.length).toBe(3)

		await wabe.close()
	})
})
