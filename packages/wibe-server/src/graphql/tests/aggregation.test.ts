import { beforeAll, afterAll, describe, it, expect } from 'bun:test'
import { GraphQLClient, gql } from 'graphql-request'
import { WibeApp } from '../../server'
import { closeTests, getGraphqlClient, setupTests } from '../../utils/helper'

const graphql = {
	findMany_User: gql`
        query findMany_User($where: _UserWhereInput) {
            findMany_User(where: $where) {
                edges {
                    node {
                        id
                        name
                        age
                        isAdmin
                        floatValue
                    }
                }
            }
        }
    `,
	createMany_User: gql`
        mutation createMany_User($input: _UsersCreateInput!) {
            createMany_User(input: $input) {
                edges {
                    node {
                        id
                        name
                        age
                        isAdmin
                        floatValue
                    }
                }
            }
        }
    `,
}

describe('GraphQL : aggregation', () => {
	let wibe: WibeApp
	let port: number
	let client: GraphQLClient

	const now = new Date()

	beforeAll(async () => {
		const setup = await setupTests()
		wibe = setup.wibe
		port = setup.port
		client = getGraphqlClient(port)

		await client.request<any>(graphql.createMany_User, {
			input: {
				fields: [
					{
						name: 'Lucas',
						age: 20,
						isAdmin: true,
						floatValue: 1.5,
						birthDate: now,
						arrayValue: ['a', 'b'],
						email: 'lucas@mail.fr',
					},
					{
						name: 'Jeanne',
						age: 18,
						isAdmin: false,
						floatValue: 2.5,
						birthDate: new Date(Date.now() + 100000),
						arrayValue: ['c', 'd'],
						email: 'jean.doe@mail.fr',
					},
				],
			},
		})
	})

	afterAll(async () => {
		await closeTests(wibe)
	})

	it("should support Array's aggregation", async () => {
		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					arrayValue: { contains: 'a' },
				},
			}),
		).toEqual({
			findMany_User: {
				edges: [
					{
						node: {
							id: expect.any(String),
							name: 'Lucas',
							age: 20,
							isAdmin: true,
							floatValue: 1.5,
						},
					},
				],
			},
		})

		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					arrayValue: { notContains: 'a' },
				},
			}),
		).toEqual({
			findMany_User: {
				edges: [
					{
						node: {
							id: expect.any(String),
							name: 'Jeanne',
							age: 18,
							isAdmin: false,
							floatValue: 2.5,
						},
					},
				],
			},
		})

		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					arrayValue: { equalTo: ['a', 'b'] },
				},
			}),
		).toEqual({
			findMany_User: {
				edges: [
					{
						node: {
							id: expect.any(String),
							name: 'Lucas',
							age: 20,
							isAdmin: true,
							floatValue: 1.5,
						},
					},
				],
			},
		})

		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					arrayValue: { notEqualTo: ['a', 'b'] },
				},
			}),
		).toEqual({
			findMany_User: {
				edges: [
					{
						node: {
							id: expect.any(String),
							name: 'Jeanne',
							age: 18,
							isAdmin: false,
							floatValue: 2.5,
						},
					},
				],
			},
		})

		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					arrayValue: { equalTo: ['z', 'w'] },
				},
			}),
		).toEqual({
			findMany_User: { edges: [] },
		})

		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					arrayValue: { contains: 'z' },
				},
			}),
		).toEqual({
			findMany_User: { edges: [] },
		})
	})

	it("should support DateScalarType's aggregation", async () => {
		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					birthDate: { equalTo: now },
				},
			}),
		).toEqual({
			findMany_User: {
				edges: [
					{
						node: {
							id: expect.any(String),
							name: 'Lucas',
							age: 20,
							isAdmin: true,
							floatValue: 1.5,
						},
					},
				],
			},
		})

		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					birthDate: { notEqualTo: now },
				},
			}),
		).toEqual({
			findMany_User: {
				edges: [
					{
						node: {
							id: expect.any(String),
							name: 'Jeanne',
							age: 18,
							isAdmin: false,
							floatValue: 2.5,
						},
					},
				],
			},
		})

		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					birthDate: { lessThan: new Date(now.getTime() + 1000) },
				},
			}),
		).toEqual({
			findMany_User: {
				edges: [
					{
						node: {
							id: expect.any(String),
							name: 'Lucas',
							age: 20,
							isAdmin: true,
							floatValue: 1.5,
						},
					},
				],
			},
		})

		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					birthDate: { lessThanOrEqualTo: now },
				},
			}),
		).toEqual({
			findMany_User: {
				edges: [
					{
						node: {
							id: expect.any(String),
							name: 'Lucas',
							age: 20,
							isAdmin: true,
							floatValue: 1.5,
						},
					},
				],
			},
		})

		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					birthDate: { greaterThan: now },
				},
			}),
		).toEqual({
			findMany_User: {
				edges: [
					{
						node: {
							id: expect.any(String),
							name: 'Jeanne',
							age: 18,
							isAdmin: false,
							floatValue: 2.5,
						},
					},
				],
			},
		})

		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					birthDate: { greaterThanOrEqualTo: now },
				},
			}),
		).toEqual({
			findMany_User: {
				edges: [
					{
						node: {
							id: expect.any(String),
							name: 'Lucas',
							age: 20,
							isAdmin: true,
							floatValue: 1.5,
						},
					},
					{
						node: {
							id: expect.any(String),
							name: 'Jeanne',
							age: 18,
							isAdmin: false,
							floatValue: 2.5,
						},
					},
				],
			},
		})

		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					birthDate: { in: [now] },
				},
			}),
		).toEqual({
			findMany_User: {
				edges: [
					{
						node: {
							id: expect.any(String),
							name: 'Lucas',
							age: 20,
							isAdmin: true,
							floatValue: 1.5,
						},
					},
				],
			},
		})

		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					birthDate: { notIn: [now] },
				},
			}),
		).toEqual({
			findMany_User: {
				edges: [
					{
						node: {
							id: expect.any(String),
							name: 'Jeanne',
							age: 18,
							isAdmin: false,
							floatValue: 2.5,
						},
					},
				],
			},
		})
	})

	it("should support EmailScalayType's aggregation", async () => {
		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					email: { equalTo: 'lucas@mail.fr' },
				},
			}),
		).toEqual({
			findMany_User: {
				edges: [
					{
						node: {
							id: expect.any(String),
							name: 'Lucas',
							age: 20,
							isAdmin: true,
							floatValue: 1.5,
						},
					},
				],
			},
		})

		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					email: { notEqualTo: 'lucas@mail.fr' },
				},
			}),
		).toEqual({
			findMany_User: {
				edges: [
					{
						node: {
							id: expect.any(String),
							name: 'Jeanne',
							age: 18,
							isAdmin: false,
							floatValue: 2.5,
						},
					},
				],
			},
		})

		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					email: { in: ['lucas@mail.fr'] },
				},
			}),
		).toEqual({
			findMany_User: {
				edges: [
					{
						node: {
							id: expect.any(String),
							name: 'Lucas',
							age: 20,
							isAdmin: true,
							floatValue: 1.5,
						},
					},
				],
			},
		})

		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					email: { notIn: ['lucas@mail.fr'] },
				},
			}),
		).toEqual({
			findMany_User: {
				edges: [
					{
						node: {
							id: expect.any(String),
							name: 'Jeanne',
							age: 18,
							isAdmin: false,
							floatValue: 2.5,
						},
					},
				],
			},
		})
	})

	it("should support Int's aggregation", async () => {
		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					age: { equalTo: 20 },
				},
			}),
		).toEqual({
			findMany_User: {
				edges: [
					{
						node: {
							id: expect.any(String),
							name: 'Lucas',
							age: 20,
							isAdmin: true,
							floatValue: 1.5,
						},
					},
				],
			},
		})

		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					age: { notEqualTo: 20 },
				},
			}),
		).toEqual({
			findMany_User: {
				edges: [
					{
						node: {
							id: expect.any(String),
							name: 'Jeanne',
							age: 18,
							isAdmin: false,
							floatValue: 2.5,
						},
					},
				],
			},
		})

		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					age: { lessThan: 20 },
				},
			}),
		).toEqual({
			findMany_User: {
				edges: [
					{
						node: {
							id: expect.any(String),
							name: 'Jeanne',
							age: 18,
							isAdmin: false,
							floatValue: 2.5,
						},
					},
				],
			},
		})

		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					age: { lessThanOrEqualTo: 20 },
				},
			}),
		).toEqual({
			findMany_User: {
				edges: [
					{
						node: {
							id: expect.any(String),
							name: 'Lucas',
							age: 20,
							isAdmin: true,
							floatValue: 1.5,
						},
					},
					{
						node: {
							id: expect.any(String),
							name: 'Jeanne',
							age: 18,
							isAdmin: false,
							floatValue: 2.5,
						},
					},
				],
			},
		})

		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					age: { greaterThan: 18 },
				},
			}),
		).toEqual({
			findMany_User: {
				edges: [
					{
						node: {
							id: expect.any(String),
							name: 'Lucas',
							age: 20,
							isAdmin: true,
							floatValue: 1.5,
						},
					},
				],
			},
		})

		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					age: { greaterThanOrEqualTo: 18 },
				},
			}),
		).toEqual({
			findMany_User: {
				edges: [
					{
						node: {
							id: expect.any(String),
							name: 'Lucas',
							age: 20,
							isAdmin: true,
							floatValue: 1.5,
						},
					},
					{
						node: {
							id: expect.any(String),
							name: 'Jeanne',
							age: 18,
							isAdmin: false,
							floatValue: 2.5,
						},
					},
				],
			},
		})

		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					age: { in: [20] },
				},
			}),
		).toEqual({
			findMany_User: {
				edges: [
					{
						node: {
							id: expect.any(String),
							name: 'Lucas',
							age: 20,
							isAdmin: true,
							floatValue: 1.5,
						},
					},
				],
			},
		})

		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					age: { notIn: [20] },
				},
			}),
		).toEqual({
			findMany_User: {
				edges: [
					{
						node: {
							id: expect.any(String),
							name: 'Jeanne',
							age: 18,
							isAdmin: false,
							floatValue: 2.5,
						},
					},
				],
			},
		})
	})

	it("should support Boolean's aggregation", async () => {
		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					isAdmin: { equalTo: true },
				},
			}),
		).toEqual({
			findMany_User: {
				edges: [
					{
						node: {
							id: expect.any(String),
							name: 'Lucas',
							age: 20,
							isAdmin: true,
							floatValue: 1.5,
						},
					},
				],
			},
		})

		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					isAdmin: { notEqualTo: true },
				},
			}),
		).toEqual({
			findMany_User: {
				edges: [
					{
						node: {
							id: expect.any(String),
							name: 'Jeanne',
							age: 18,
							isAdmin: false,
							floatValue: 2.5,
						},
					},
				],
			},
		})

		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					isAdmin: { in: [true] },
				},
			}),
		).toEqual({
			findMany_User: {
				edges: [
					{
						node: {
							id: expect.any(String),
							name: 'Lucas',
							age: 20,
							isAdmin: true,
							floatValue: 1.5,
						},
					},
				],
			},
		})

		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					isAdmin: { notIn: [true] },
				},
			}),
		).toEqual({
			findMany_User: {
				edges: [
					{
						node: {
							id: expect.any(String),
							name: 'Jeanne',
							age: 18,
							isAdmin: false,
							floatValue: 2.5,
						},
					},
				],
			},
		})
	})

	it("should support Float's aggregation", async () => {
		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					floatValue: { equalTo: 1.5 },
				},
			}),
		).toEqual({
			findMany_User: {
				edges: [
					{
						node: {
							id: expect.any(String),
							name: 'Lucas',
							age: 20,
							isAdmin: true,
							floatValue: 1.5,
						},
					},
				],
			},
		})

		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					floatValue: { notEqualTo: 1.5 },
				},
			}),
		).toEqual({
			findMany_User: {
				edges: [
					{
						node: {
							id: expect.any(String),
							name: 'Jeanne',
							age: 18,
							isAdmin: false,
							floatValue: 2.5,
						},
					},
				],
			},
		})

		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					floatValue: { lessThan: 2.5 },
				},
			}),
		).toEqual({
			findMany_User: {
				edges: [
					{
						node: {
							id: expect.any(String),
							name: 'Lucas',
							age: 20,
							isAdmin: true,
							floatValue: 1.5,
						},
					},
				],
			},
		})

		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					floatValue: { lessThanOrEqualTo: 2.5 },
				},
			}),
		).toEqual({
			findMany_User: {
				edges: [
					{
						node: {
							id: expect.any(String),
							name: 'Lucas',
							age: 20,
							isAdmin: true,
							floatValue: 1.5,
						},
					},
					{
						node: {
							id: expect.any(String),
							name: 'Jeanne',
							age: 18,
							isAdmin: false,
							floatValue: 2.5,
						},
					},
				],
			},
		})

		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					floatValue: { greaterThan: 1.5 },
				},
			}),
		).toEqual({
			findMany_User: {
				edges: [
					{
						node: {
							id: expect.any(String),
							name: 'Jeanne',
							age: 18,
							isAdmin: false,
							floatValue: 2.5,
						},
					},
				],
			},
		})

		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					floatValue: { greaterThanOrEqualTo: 2.5 },
				},
			}),
		).toEqual({
			findMany_User: {
				edges: [
					{
						node: {
							id: expect.any(String),
							name: 'Jeanne',
							age: 18,
							isAdmin: false,
							floatValue: 2.5,
						},
					},
				],
			},
		})

		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					floatValue: { in: [1.5] },
				},
			}),
		).toEqual({
			findMany_User: {
				edges: [
					{
						node: {
							id: expect.any(String),
							name: 'Lucas',
							age: 20,
							isAdmin: true,
							floatValue: 1.5,
						},
					},
				],
			},
		})

		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					floatValue: { notIn: [1.5] },
				},
			}),
		).toEqual({
			findMany_User: {
				edges: [
					{
						node: {
							id: expect.any(String),
							name: 'Jeanne',
							age: 18,
							isAdmin: false,
							floatValue: 2.5,
						},
					},
				],
			},
		})
	})

	it("should support String's aggregation", async () => {
		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					name: { notEqualTo: 'Lucas' },
				},
			}),
		).toEqual({
			findMany_User: {
				edges: [
					{
						node: {
							id: expect.any(String),
							name: 'Jeanne',
							age: 18,
							isAdmin: false,
							floatValue: 2.5,
						},
					},
				],
			},
		})

		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					name: { equalTo: 'Lucas' },
				},
			}),
		).toEqual({
			findMany_User: {
				edges: [
					{
						node: {
							id: expect.any(String),
							name: 'Lucas',
							age: 20,
							isAdmin: true,
							floatValue: 1.5,
						},
					},
				],
			},
		})

		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					name: { in: ['Lucas'] },
				},
			}),
		).toEqual({
			findMany_User: {
				edges: [
					{
						node: {
							id: expect.any(String),
							name: 'Lucas',
							age: 20,
							isAdmin: true,
							floatValue: 1.5,
						},
					},
				],
			},
		})

		expect(
			await client.request<any>(graphql.findMany_User, {
				where: {
					name: { notIn: ['Lucas'] },
				},
			}),
		).toEqual({
			findMany_User: {
				edges: [
					{
						node: {
							id: expect.any(String),
							name: 'Jeanne',
							age: 18,
							isAdmin: false,
							floatValue: 2.5,
						},
					},
				],
			},
		})
	})

	it('should support OR statement', async () => {
		const { findMany_User } = await client.request<any>(
			graphql.findMany_User,
			{
				where: {
					OR: [{ age: { equalTo: 20 } }, { age: { equalTo: 18 } }],
				},
			},
		)

		expect(findMany_User.edges).toEqual([
			{
				node: {
					id: expect.any(String),
					name: 'Lucas',
					age: 20,
					isAdmin: true,
					floatValue: 1.5,
				},
			},
			{
				node: {
					id: expect.any(String),
					name: 'Jeanne',
					age: 18,
					isAdmin: false,
					floatValue: 2.5,
				},
			},
		])

		const { findMany_User: users2 } = await client.request<any>(
			graphql.findMany_User,
			{
				where: {
					OR: [{ age: { equalTo: 20 } }, { age: { equalTo: 19 } }],
				},
			},
		)

		expect(users2.edges).toEqual([
			{
				node: {
					id: expect.any(String),
					name: 'Lucas',
					age: 20,
					isAdmin: true,
					floatValue: 1.5,
				},
			},
		])
	})

	it('should support AND statement', async () => {
		const { findMany_User } = await client.request<any>(
			graphql.findMany_User,
			{
				where: {
					AND: [{ age: { equalTo: 20 } }, { age: { equalTo: 18 } }],
				},
			},
		)

		expect(findMany_User.edges).toEqual([])

		const { findMany_User: users2 } = await client.request<any>(
			graphql.findMany_User,
			{
				where: {
					AND: [
						{ age: { equalTo: 20 } },
						{ isAdmin: { equalTo: true } },
					],
				},
			},
		)

		expect(users2.edges).toEqual([
			{
				node: {
					id: expect.any(String),
					name: 'Lucas',
					age: 20,
					isAdmin: true,
					floatValue: 1.5,
				},
			},
		])
	})
})
