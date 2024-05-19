import { beforeAll, afterAll, describe, it, expect } from 'bun:test'
import { type GraphQLClient, gql } from 'graphql-request'
import type { WibeApp } from '../../server'
import { closeTests, getGraphqlClient, setupTests } from '../../utils/helper'

const graphql = {
	_users: gql`
		query _users($where: _UserWhereInput) {
			_users(where: $where) {
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
	create_Users: gql`
		mutation create_Users($input: Create_UsersInput!) {
			create_Users(input: $input) {
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

		await client.request<any>(graphql.create_Users, {
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
			await client.request<any>(graphql._users, {
				where: {
					arrayValue: { contains: 'a' },
				},
			}),
		).toEqual({
			_users: {
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
			await client.request<any>(graphql._users, {
				where: {
					arrayValue: { notContains: 'a' },
				},
			}),
		).toEqual({
			_users: {
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
			await client.request<any>(graphql._users, {
				where: {
					arrayValue: { equalTo: ['a', 'b'] },
				},
			}),
		).toEqual({
			_users: {
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
			await client.request<any>(graphql._users, {
				where: {
					arrayValue: { notEqualTo: ['a', 'b'] },
				},
			}),
		).toEqual({
			_users: {
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
			await client.request<any>(graphql._users, {
				where: {
					arrayValue: { equalTo: ['z', 'w'] },
				},
			}),
		).toEqual({
			_users: { edges: [] },
		})

		expect(
			await client.request<any>(graphql._users, {
				where: {
					arrayValue: { contains: 'z' },
				},
			}),
		).toEqual({
			_users: { edges: [] },
		})
	})

	it("should support DateScalarType's aggregation", async () => {
		expect(
			await client.request<any>(graphql._users, {
				where: {
					birthDate: { equalTo: now },
				},
			}),
		).toEqual({
			_users: {
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
			await client.request<any>(graphql._users, {
				where: {
					birthDate: { notEqualTo: now },
				},
			}),
		).toEqual({
			_users: {
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
			await client.request<any>(graphql._users, {
				where: {
					birthDate: { lessThan: new Date(now.getTime() + 1000) },
				},
			}),
		).toEqual({
			_users: {
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
			await client.request<any>(graphql._users, {
				where: {
					birthDate: { lessThanOrEqualTo: now },
				},
			}),
		).toEqual({
			_users: {
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
			await client.request<any>(graphql._users, {
				where: {
					birthDate: { greaterThan: now },
				},
			}),
		).toEqual({
			_users: {
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
			await client.request<any>(graphql._users, {
				where: {
					birthDate: { greaterThanOrEqualTo: now },
				},
			}),
		).toEqual({
			_users: {
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
			await client.request<any>(graphql._users, {
				where: {
					birthDate: { in: [now] },
				},
			}),
		).toEqual({
			_users: {
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
			await client.request<any>(graphql._users, {
				where: {
					birthDate: { notIn: [now] },
				},
			}),
		).toEqual({
			_users: {
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
			await client.request<any>(graphql._users, {
				where: {
					email: { equalTo: 'lucas@mail.fr' },
				},
			}),
		).toEqual({
			_users: {
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
			await client.request<any>(graphql._users, {
				where: {
					email: { notEqualTo: 'lucas@mail.fr' },
				},
			}),
		).toEqual({
			_users: {
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
			await client.request<any>(graphql._users, {
				where: {
					email: { in: ['lucas@mail.fr'] },
				},
			}),
		).toEqual({
			_users: {
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
			await client.request<any>(graphql._users, {
				where: {
					email: { notIn: ['lucas@mail.fr'] },
				},
			}),
		).toEqual({
			_users: {
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
			await client.request<any>(graphql._users, {
				where: {
					age: { equalTo: 20 },
				},
			}),
		).toEqual({
			_users: {
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
			await client.request<any>(graphql._users, {
				where: {
					age: { notEqualTo: 20 },
				},
			}),
		).toEqual({
			_users: {
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
			await client.request<any>(graphql._users, {
				where: {
					age: { lessThan: 20 },
				},
			}),
		).toEqual({
			_users: {
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
			await client.request<any>(graphql._users, {
				where: {
					age: { lessThanOrEqualTo: 20 },
				},
			}),
		).toEqual({
			_users: {
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
			await client.request<any>(graphql._users, {
				where: {
					age: { greaterThan: 18 },
				},
			}),
		).toEqual({
			_users: {
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
			await client.request<any>(graphql._users, {
				where: {
					age: { greaterThanOrEqualTo: 18 },
				},
			}),
		).toEqual({
			_users: {
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
			await client.request<any>(graphql._users, {
				where: {
					age: { in: [20] },
				},
			}),
		).toEqual({
			_users: {
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
			await client.request<any>(graphql._users, {
				where: {
					age: { notIn: [20] },
				},
			}),
		).toEqual({
			_users: {
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
			await client.request<any>(graphql._users, {
				where: {
					isAdmin: { equalTo: true },
				},
			}),
		).toEqual({
			_users: {
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
			await client.request<any>(graphql._users, {
				where: {
					isAdmin: { notEqualTo: true },
				},
			}),
		).toEqual({
			_users: {
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
			await client.request<any>(graphql._users, {
				where: {
					isAdmin: { in: [true] },
				},
			}),
		).toEqual({
			_users: {
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
			await client.request<any>(graphql._users, {
				where: {
					isAdmin: { notIn: [true] },
				},
			}),
		).toEqual({
			_users: {
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
			await client.request<any>(graphql._users, {
				where: {
					floatValue: { equalTo: 1.5 },
				},
			}),
		).toEqual({
			_users: {
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
			await client.request<any>(graphql._users, {
				where: {
					floatValue: { notEqualTo: 1.5 },
				},
			}),
		).toEqual({
			_users: {
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
			await client.request<any>(graphql._users, {
				where: {
					floatValue: { lessThan: 2.5 },
				},
			}),
		).toEqual({
			_users: {
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
			await client.request<any>(graphql._users, {
				where: {
					floatValue: { lessThanOrEqualTo: 2.5 },
				},
			}),
		).toEqual({
			_users: {
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
			await client.request<any>(graphql._users, {
				where: {
					floatValue: { greaterThan: 1.5 },
				},
			}),
		).toEqual({
			_users: {
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
			await client.request<any>(graphql._users, {
				where: {
					floatValue: { greaterThanOrEqualTo: 2.5 },
				},
			}),
		).toEqual({
			_users: {
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
			await client.request<any>(graphql._users, {
				where: {
					floatValue: { in: [1.5] },
				},
			}),
		).toEqual({
			_users: {
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
			await client.request<any>(graphql._users, {
				where: {
					floatValue: { notIn: [1.5] },
				},
			}),
		).toEqual({
			_users: {
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
			await client.request<any>(graphql._users, {
				where: {
					name: { notEqualTo: 'Lucas' },
				},
			}),
		).toEqual({
			_users: {
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
			await client.request<any>(graphql._users, {
				where: {
					name: { equalTo: 'Lucas' },
				},
			}),
		).toEqual({
			_users: {
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
			await client.request<any>(graphql._users, {
				where: {
					name: { in: ['Lucas'] },
				},
			}),
		).toEqual({
			_users: {
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
			await client.request<any>(graphql._users, {
				where: {
					name: { notIn: ['Lucas'] },
				},
			}),
		).toEqual({
			_users: {
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
		const { _users } = await client.request<any>(graphql._users, {
			where: {
				OR: [{ age: { equalTo: 20 } }, { age: { equalTo: 18 } }],
			},
		})

		expect(_users.edges).toEqual([
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

		const { _users: users2 } = await client.request<any>(graphql._users, {
			where: {
				OR: [{ age: { equalTo: 20 } }, { age: { equalTo: 19 } }],
			},
		})

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
		const { _users } = await client.request<any>(graphql._users, {
			where: {
				AND: [{ age: { equalTo: 20 } }, { age: { equalTo: 18 } }],
			},
		})

		expect(_users.edges).toEqual([])

		const { _users: users2 } = await client.request<any>(graphql._users, {
			where: {
				AND: [{ age: { equalTo: 20 } }, { isAdmin: { equalTo: true } }],
			},
		})

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
