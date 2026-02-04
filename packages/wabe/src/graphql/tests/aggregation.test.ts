import { beforeAll, afterAll, describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { type GraphQLClient, gql } from 'graphql-request'
import type { Wabe } from '../../server'
import { type DevWabeTypes, getGraphqlClient } from '../../utils/helper'
import { setupTests, closeTests } from '../../utils/testHelper'

const graphql = {
	users: gql`
		query users($where: UserWhereInput) {
			users(where: $where) {
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
	createUsers: gql`
		mutation createUsers($input: CreateUsersInput!) {
			createUsers(input: $input) {
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
	let wabe: Wabe<DevWabeTypes>
	let port: number
	let client: GraphQLClient

	const now = new Date()

	beforeAll(async () => {
		const setup = await setupTests()
		wabe = setup.wabe
		port = setup.port
		client = getGraphqlClient(port)
	})

	beforeEach(async () => {
		await client.request<any>(graphql.createUsers, {
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

	afterEach(async () => {
		await wabe.controllers.database.clearDatabase()
	})

	afterAll(async () => {
		await closeTests(wabe)
	})

	it("should support Array's aggregation", async () => {
		expect(
			await client.request<any>(graphql.users, {
				where: {
					arrayValue: { contains: ['a'] },
				},
			}),
		).toEqual({
			users: {
				edges: [
					{
						node: {
							id: expect.anything(),
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
			await client.request<any>(graphql.users, {
				where: {
					arrayValue: { notContains: 'a' },
				},
			}),
		).toEqual({
			users: {
				edges: [
					{
						node: {
							id: expect.anything(),
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
			await client.request<any>(graphql.users, {
				where: {
					arrayValue: { equalTo: ['a', 'b'] },
				},
			}),
		).toEqual({
			users: {
				edges: [
					{
						node: {
							id: expect.anything(),
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
			await client.request<any>(graphql.users, {
				where: {
					arrayValue: { notEqualTo: ['a', 'b'] },
				},
			}),
		).toEqual({
			users: {
				edges: [
					{
						node: {
							id: expect.anything(),
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
			await client.request<any>(graphql.users, {
				where: {
					arrayValue: { equalTo: ['z', 'w'] },
				},
			}),
		).toEqual({
			users: { edges: [] },
		})

		expect(
			await client.request<any>(graphql.users, {
				where: {
					arrayValue: { contains: ['z'] },
				},
			}),
		).toEqual({
			users: { edges: [] },
		})
	})

	it("should support DateScalarType's aggregation", async () => {
		expect(
			await client.request<any>(graphql.users, {
				where: {
					birthDate: { equalTo: now },
				},
			}),
		).toEqual({
			users: {
				edges: [
					{
						node: {
							id: expect.anything(),
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
			await client.request<any>(graphql.users, {
				where: {
					birthDate: { notEqualTo: now },
				},
			}),
		).toEqual({
			users: {
				edges: [
					{
						node: {
							id: expect.anything(),
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
			await client.request<any>(graphql.users, {
				where: {
					birthDate: { lessThan: new Date(now.getTime() + 1000) },
				},
			}),
		).toEqual({
			users: {
				edges: [
					{
						node: {
							id: expect.anything(),
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
			await client.request<any>(graphql.users, {
				where: {
					birthDate: { lessThanOrEqualTo: now },
				},
			}),
		).toEqual({
			users: {
				edges: [
					{
						node: {
							id: expect.anything(),
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
			await client.request<any>(graphql.users, {
				where: {
					birthDate: { greaterThan: now },
				},
			}),
		).toEqual({
			users: {
				edges: [
					{
						node: {
							id: expect.anything(),
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
			await client.request<any>(graphql.users, {
				where: {
					birthDate: { greaterThanOrEqualTo: now },
				},
			}),
		).toEqual({
			users: {
				edges: expect.arrayContaining([
					{
						node: {
							id: expect.anything(),
							name: 'Lucas',
							age: 20,
							isAdmin: true,
							floatValue: 1.5,
						},
					},
					{
						node: {
							id: expect.anything(),
							name: 'Jeanne',
							age: 18,
							isAdmin: false,
							floatValue: 2.5,
						},
					},
				]),
			},
		})

		expect(
			await client.request<any>(graphql.users, {
				where: {
					birthDate: { in: [now] },
				},
			}),
		).toEqual({
			users: {
				edges: [
					{
						node: {
							id: expect.anything(),
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
			await client.request<any>(graphql.users, {
				where: {
					birthDate: { notIn: [now] },
				},
			}),
		).toEqual({
			users: {
				edges: [
					{
						node: {
							id: expect.anything(),
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
			await client.request<any>(graphql.users, {
				where: {
					email: { equalTo: 'lucas@mail.fr' },
				},
			}),
		).toEqual({
			users: {
				edges: [
					{
						node: {
							id: expect.anything(),
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
			await client.request<any>(graphql.users, {
				where: {
					email: { notEqualTo: 'lucas@mail.fr' },
				},
			}),
		).toEqual({
			users: {
				edges: [
					{
						node: {
							id: expect.anything(),
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
			await client.request<any>(graphql.users, {
				where: {
					email: { in: ['lucas@mail.fr'] },
				},
			}),
		).toEqual({
			users: {
				edges: [
					{
						node: {
							id: expect.anything(),
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
			await client.request<any>(graphql.users, {
				where: {
					email: { notIn: ['lucas@mail.fr'] },
				},
			}),
		).toEqual({
			users: {
				edges: [
					{
						node: {
							id: expect.anything(),
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
			await client.request<any>(graphql.users, {
				where: {
					age: { equalTo: 20 },
				},
			}),
		).toEqual({
			users: {
				edges: [
					{
						node: {
							id: expect.anything(),
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
			await client.request<any>(graphql.users, {
				where: {
					age: { notEqualTo: 20 },
				},
			}),
		).toEqual({
			users: {
				edges: [
					{
						node: {
							id: expect.anything(),
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
			await client.request<any>(graphql.users, {
				where: {
					age: { lessThan: 20 },
				},
			}),
		).toEqual({
			users: {
				edges: [
					{
						node: {
							id: expect.anything(),
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
			await client.request<any>(graphql.users, {
				where: {
					age: { lessThanOrEqualTo: 20 },
				},
			}),
		).toEqual({
			users: {
				edges: expect.arrayContaining([
					{
						node: {
							id: expect.anything(),
							name: 'Lucas',
							age: 20,
							isAdmin: true,
							floatValue: 1.5,
						},
					},
					{
						node: {
							id: expect.anything(),
							name: 'Jeanne',
							age: 18,
							isAdmin: false,
							floatValue: 2.5,
						},
					},
				]),
			},
		})

		expect(
			await client.request<any>(graphql.users, {
				where: {
					age: { greaterThan: 18 },
				},
			}),
		).toEqual({
			users: {
				edges: [
					{
						node: {
							id: expect.anything(),
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
			await client.request<any>(graphql.users, {
				where: {
					age: { greaterThanOrEqualTo: 18 },
				},
			}),
		).toEqual({
			users: {
				edges: expect.arrayContaining([
					{
						node: {
							id: expect.anything(),
							name: 'Lucas',
							age: 20,
							isAdmin: true,
							floatValue: 1.5,
						},
					},
					{
						node: {
							id: expect.anything(),
							name: 'Jeanne',
							age: 18,
							isAdmin: false,
							floatValue: 2.5,
						},
					},
				]),
			},
		})

		expect(
			await client.request<any>(graphql.users, {
				where: {
					age: { in: [20] },
				},
			}),
		).toEqual({
			users: {
				edges: [
					{
						node: {
							id: expect.anything(),
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
			await client.request<any>(graphql.users, {
				where: {
					age: { notIn: [20] },
				},
			}),
		).toEqual({
			users: {
				edges: [
					{
						node: {
							id: expect.anything(),
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
			await client.request<any>(graphql.users, {
				where: {
					isAdmin: { equalTo: true },
				},
			}),
		).toEqual({
			users: {
				edges: [
					{
						node: {
							id: expect.anything(),
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
			await client.request<any>(graphql.users, {
				where: {
					isAdmin: { notEqualTo: true },
				},
			}),
		).toEqual({
			users: {
				edges: [
					{
						node: {
							id: expect.anything(),
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
			await client.request<any>(graphql.users, {
				where: {
					isAdmin: { in: [true] },
				},
			}),
		).toEqual({
			users: {
				edges: [
					{
						node: {
							id: expect.anything(),
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
			await client.request<any>(graphql.users, {
				where: {
					isAdmin: { notIn: [true] },
				},
			}),
		).toEqual({
			users: {
				edges: [
					{
						node: {
							id: expect.anything(),
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
			await client.request<any>(graphql.users, {
				where: {
					floatValue: { equalTo: 1.5 },
				},
			}),
		).toEqual({
			users: {
				edges: [
					{
						node: {
							id: expect.anything(),
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
			await client.request<any>(graphql.users, {
				where: {
					floatValue: { notEqualTo: 1.5 },
				},
			}),
		).toEqual({
			users: {
				edges: [
					{
						node: {
							id: expect.anything(),
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
			await client.request<any>(graphql.users, {
				where: {
					floatValue: { lessThan: 2.5 },
				},
			}),
		).toEqual({
			users: {
				edges: [
					{
						node: {
							id: expect.anything(),
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
			await client.request<any>(graphql.users, {
				where: {
					floatValue: { lessThanOrEqualTo: 2.5 },
				},
			}),
		).toEqual({
			users: {
				edges: expect.arrayContaining([
					{
						node: {
							id: expect.anything(),
							name: 'Lucas',
							age: 20,
							isAdmin: true,
							floatValue: 1.5,
						},
					},
					{
						node: {
							id: expect.anything(),
							name: 'Jeanne',
							age: 18,
							isAdmin: false,
							floatValue: 2.5,
						},
					},
				]),
			},
		})

		expect(
			await client.request<any>(graphql.users, {
				where: {
					floatValue: { greaterThan: 1.5 },
				},
			}),
		).toEqual({
			users: {
				edges: [
					{
						node: {
							id: expect.anything(),
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
			await client.request<any>(graphql.users, {
				where: {
					floatValue: { greaterThanOrEqualTo: 2.5 },
				},
			}),
		).toEqual({
			users: {
				edges: [
					{
						node: {
							id: expect.anything(),
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
			await client.request<any>(graphql.users, {
				where: {
					floatValue: { in: [1.5] },
				},
			}),
		).toEqual({
			users: {
				edges: [
					{
						node: {
							id: expect.anything(),
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
			await client.request<any>(graphql.users, {
				where: {
					floatValue: { notIn: [1.5] },
				},
			}),
		).toEqual({
			users: {
				edges: [
					{
						node: {
							id: expect.anything(),
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
			await client.request<any>(graphql.users, {
				where: {
					name: { notEqualTo: 'Lucas' },
				},
			}),
		).toEqual({
			users: {
				edges: [
					{
						node: {
							id: expect.anything(),
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
			await client.request<any>(graphql.users, {
				where: {
					name: { equalTo: 'Lucas' },
				},
			}),
		).toEqual({
			users: {
				edges: [
					{
						node: {
							id: expect.anything(),
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
			await client.request<any>(graphql.users, {
				where: {
					name: { in: ['Lucas'] },
				},
			}),
		).toEqual({
			users: {
				edges: [
					{
						node: {
							id: expect.anything(),
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
			await client.request<any>(graphql.users, {
				where: {
					name: { notIn: ['Lucas'] },
				},
			}),
		).toEqual({
			users: {
				edges: [
					{
						node: {
							id: expect.anything(),
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
		const { users } = await client.request<any>(graphql.users, {
			where: {
				OR: [{ age: { equalTo: 20 } }, { age: { equalTo: 18 } }],
			},
		})

		expect(users.edges).toEqual(
			expect.arrayContaining([
				{
					node: {
						id: expect.anything(),
						name: 'Lucas',
						age: 20,
						isAdmin: true,
						floatValue: 1.5,
					},
				},
				{
					node: {
						id: expect.anything(),
						name: 'Jeanne',
						age: 18,
						isAdmin: false,
						floatValue: 2.5,
					},
				},
			]),
		)

		const { users: users2 } = await client.request<any>(graphql.users, {
			where: {
				OR: [{ age: { equalTo: 20 } }, { age: { equalTo: 19 } }],
			},
		})

		expect(users2.edges).toEqual([
			{
				node: {
					id: expect.anything(),
					name: 'Lucas',
					age: 20,
					isAdmin: true,
					floatValue: 1.5,
				},
			},
		])
	})

	it('should support AND statement', async () => {
		const { users } = await client.request<any>(graphql.users, {
			where: {
				AND: [{ age: { equalTo: 20 } }, { age: { equalTo: 18 } }],
			},
		})

		expect(users.edges).toEqual([])

		const { users: users2 } = await client.request<any>(graphql.users, {
			where: {
				AND: [{ age: { equalTo: 20 } }, { isAdmin: { equalTo: true } }],
			},
		})

		expect(users2.edges).toEqual([
			{
				node: {
					id: expect.anything(),
					name: 'Lucas',
					age: 20,
					isAdmin: true,
					floatValue: 1.5,
				},
			},
		])
	})
})
