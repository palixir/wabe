import { describe, expect, it } from 'bun:test'
import { v4 as uuid } from 'uuid'
import { WibeApp } from '../server'
import getPort from 'get-port'
import { DatabaseEnum } from '../database'
import { gql } from 'graphql-request'
import { getGraphqlClient } from '../utils/helper'
import type { SchemaInterface } from '../schema'

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
	it('should return graphql relay standard output for default get query', async () => {
		const { client, wibeApp } = await createWibeApp({
			class: [
				{
					name: 'TestClass',
					fields: { field1: { type: 'String' } },
				},
			],
		})

		const createdObject = await client.request<any>(
			graphql.createTestClass,
			{
				input: {
					fields: { field1: 'test' },
				},
			},
		)

		const request = await client.request<any>(graphql.testClass, {
			id: createdObject.createTestClass.testClass.id,
		})

		expect(request.testClass.field1).toBe('test')

		await wibeApp.close()
	})

	it('should return graphql relay standard output for default get query (multiple)', async () => {
		const { client, wibeApp } = await createWibeApp({
			class: [
				{
					name: 'TestClass',
					fields: { field1: { type: 'String' } },
				},
			],
		})

		await client.request<any>(graphql.createTestClass, {
			input: {
				fields: { field1: 'test' },
			},
		})

		const request = await client.request<any>(graphql.testClasses, {
			where: { field1: { equalTo: 'test' } },
		})

		expect(request.testClasses.edges[0].node.field1).toBe('test')

		await wibeApp.close()
	})

	it('should return graphql relay standard output for default create mutation (clientMutationId, type)', async () => {
		const { client, wibeApp } = await createWibeApp({
			class: [
				{
					name: 'TestClass',
					fields: { field1: { type: 'String' } },
				},
			],
		})

		const request = await client.request<any>(graphql.createTestClass, {
			input: { fields: { field1: 'test' } },
		})

		expect(request.createTestClass.testClass.field1).toBe('test')

		await wibeApp.close()
	})

	it('should return graphql relay standard output for default creates (multiple) mutation', async () => {
		const { client, wibeApp } = await createWibeApp({
			class: [
				{
					name: 'TestClass',
					fields: { field1: { type: 'String' } },
				},
			],
		})

		const request = await client.request<any>(graphql.createTestClasses, {
			input: { fields: [{ field1: 'test' }] },
		})

		expect(request.createTestClasses.edges[0].node.field1).toBe('test')

		await wibeApp.close()
	})

	it('should return graphql relay standard output for default update mutation (clientMutationId, type)', async () => {
		const { client, wibeApp } = await createWibeApp({
			class: [
				{
					name: 'TestClass',
					fields: { field1: { type: 'String' } },
				},
			],
		})

		const createdObject = await client.request<any>(
			graphql.createTestClass,
			{
				input: {
					fields: { field1: 'test' },
				},
			},
		)

		const request = await client.request<any>(graphql.updateTestClass, {
			input: {
				fields: { field1: 'test2' },
				id: createdObject.createTestClass.testClass.id,
			},
		})

		expect(request.updateTestClass.testClass.field1).toBe('test2')

		await wibeApp.close()
	})

	it('should return graphql relay standard output for default updates (multiple) mutation', async () => {
		const { client, wibeApp } = await createWibeApp({
			class: [
				{
					name: 'TestClass',
					fields: { field1: { type: 'String' } },
				},
			],
		})

		await client.request<any>(graphql.createTestClass, {
			input: {
				fields: { field1: 'test' },
			},
		})

		const request = await client.request<any>(graphql.updateTestClasses, {
			input: {
				fields: { field1: 'test2' },
				where: { field1: { equalTo: 'test' } },
			},
		})

		expect(request.updateTestClasses.edges[0].node.field1).toBe('test2')

		await wibeApp.close()
	})

	it('should return graphql relay standard output for default delete mutation (clientMutationId, type)', async () => {
		const { client, wibeApp } = await createWibeApp({
			class: [
				{
					name: 'TestClass',
					fields: { field1: { type: 'String' } },
				},
			],
		})

		const createdObject = await client.request<any>(
			graphql.createTestClass,
			{
				input: {
					fields: { field1: 'test' },
				},
			},
		)

		const request = await client.request<any>(graphql.deleteTestClass, {
			input: {
				id: createdObject.createTestClass.testClass.id,
			},
		})

		expect(request.deleteTestClass.testClass.field1).toBe('test')

		await wibeApp.close()
	})

	it('should return graphql relay standard output for default deletes (multiple) mutation', async () => {
		const { client, wibeApp } = await createWibeApp({
			class: [
				{
					name: 'TestClass',
					fields: { field1: { type: 'String' } },
				},
			],
		})

		await client.request<any>(graphql.createTestClass, {
			input: {
				fields: { field1: 'test' },
			},
		})

		const request = await client.request<any>(graphql.deleteTestClasses, {
			input: {
				where: { field1: { equalTo: 'test' } },
			},
		})

		expect(request.deleteTestClasses.edges[0].node.field1).toBe('test')

		await wibeApp.close()
	})

	it('should not create input for mutation when there is no field', async () => {
		const { client, wibeApp } = await createWibeApp({
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
					},
				},
			],
		})

		const request = await client.request<any>(graphql.customMutation, {})

		expect(request.customMutation).toBe(true)

		await wibeApp.close()
	})

	it('should create custom query', async () => {
		const { client, wibeApp } = await createWibeApp({
			class: [
				{
					name: 'TestClass',
					fields: { field1: { type: 'String' } },
					resolvers: {
						queries: {
							customQuery: {
								type: 'Boolean',
								resolve: () => true,
							},
						},
					},
				},
			],
		})

		const request = await client.request<any>(
			gql`
				query customQuery {
					customQuery
				}
			`,
			{},
		)

		expect(request.customQuery).toBe(true)

		await wibeApp.close()
	})

	it('should create custom mutation', async () => {
		const { client, wibeApp } = await createWibeApp({
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
					},
				},
			],
		})

		const request = await client.request<any>(
			gql`
				mutation customMutation {
					customMutation
				}
			`,
			{},
		)

		expect(request.customMutation).toBe(true)

		await wibeApp.close()
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

	it('should create mutation with empty input', async () => {
		const { client, wibeApp } = await createWibeApp({
			class: [
				{
					name: 'TestClass',
					fields: { field1: { type: 'String' } },
					resolvers: {
						mutations: {
							customMutation: {
								type: 'Boolean',
								resolve: () => true,
								args: {
									input: {},
								},
							},
						},
					},
				},
			],
		})

		const request = await client.request<any>(graphql.customMutation, {})

		expect(request.customMutation).toBe(true)

		await wibeApp.close()
	})

	it('should execute when there is no fields', async () => {
		const { client, wibeApp } = await createWibeApp({
			class: [
				{
					name: 'TestClass',
					fields: { field1: { type: 'String' } },
					resolvers: {
						queries: {
							customQueries: {
								type: 'Boolean',
								resolve: () => true,
							},
						},
					},
				},
			],
		})

		const request = await client.request<any>(graphql.customQueries, {})

		expect(request.customQueries).toBe(true)

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

	it('should request a sub sub object', async () => {
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
							fields: { field1: { field2: "test2", field3: 1 } }
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
				query testClasses {
					testClasses(
						where: { field1: { field2: { equalTo: "test2" } } }
					) {
						edges {
							node {
								field1 {
									field2
								}
							}
						}
					}
				}
			`,
			{},
		)

		expect(request.testClasses.edges[0].node.field1.field2).toBe('test2')

		await wibeApp.close()
	})
})

const graphql = {
	testClass: gql`
		query testClass($id: ID!) {
			testClass(id: $id) {
				field1
			}
		}
	`,
	testClasses: gql`
		query testClasses($where: TestClassWhereInput!) {
			testClasses(where: $where) {
				edges {
					node {
						field1
					}
				}
			}
		}
	`,
	deleteTestClass: gql`
		mutation deleteTestClass($input: DeleteTestClassInput!) {
			deleteTestClass(input: $input) {
				testClass {
					field1
				}
			}
		}
	`,
	deleteTestClasses: gql`
		mutation deleteTestClasses($input: DeleteTestClassesInput!) {
			deleteTestClasses(input: $input) {
				edges {
					node {
						field1
					}
				}
			}
		}
	`,
	updateTestClass: gql`
		mutation updateTestClass($input: UpdateTestClassInput!) {
			updateTestClass(input: $input) {
				testClass {
					field1
				}
			}
		}
	`,
	updateTestClasses: gql`
		mutation updateTestClasses($input: UpdateTestClassesInput!) {
			updateTestClasses(input: $input) {
				edges {
					node {
						field1
					}
				}
			}
		}
	`,
	createTestClass: gql`
		mutation createTestClass($input: CreateTestClassInput!) {
			createTestClass(input: $input) {
				testClass {
					id
					field1
				}
			}
		}
	`,
	createTestClasses: gql`
		mutation createTestClasses($input: CreateTestClassesInput!) {
			createTestClasses(input: $input) {
				edges {
					node {
						field1
					}
				}
			}
		}
	`,
	customMutation: gql`
		mutation customMutation {
			customMutation
		}
	`,
	customQueries: gql`
		query customQueries {
			customQueries
		}
	`,
}
