import { beforeAll, afterAll, describe, it, expect } from 'bun:test'
import { GraphQLClient, gql } from 'graphql-request'
import { WibeApp } from '../server'
import { closeTests, getGraphqlClient, setupTests } from '../utils/testHelper'

const graphql = {
	users: gql`
		query users($where: UserWhereInput) {
			users(where: $where) {
				id
				name
				age
				isAdmin
				floatValue
			}
		}
	`,
	createUsers: gql`
		mutation createUsers($input: [UserCreateInput]) {
			createUsers(input: $input) {
				id
				name
				age
				isAdmin
				floatValue
			}
		}
	`,
}

describe('GraphQL : aggregation', () => {
	let wibe: WibeApp
	let port: number
	let client: GraphQLClient

	beforeAll(async () => {
		const setup = await setupTests()
		wibe = setup.wibe
		port = setup.port
		client = getGraphqlClient(port)

		await client.request<any>(graphql.createUsers, {
			input: [
				{ name: 'Lucas', age: 20, isAdmin: true, floatValue: 1.5 },
				{ name: 'Jeanne', age: 18, isAdmin: false, floatValue: 2.5 },
			],
		})
	})

	afterAll(async () => {
		await closeTests(wibe)
	})

	it('should support equalTo for each wibe scalar', async () => {
		const { users } = await client.request<any>(graphql.users, {
			where: {
				age: { equalTo: 20 },
			},
		})

		expect(users).toEqual([
			{
				id: expect.any(String),
				name: 'Lucas',
				age: 20,
				isAdmin: true,
				floatValue: 1.5,
			},
		])

		const { users: users2 } = await client.request<any>(graphql.users, {
			where: {
				isAdmin: { equalTo: true },
			},
		})

		expect(users2).toEqual([
			{
				id: expect.any(String),
				name: 'Lucas',
				age: 20,
				isAdmin: true,
				floatValue: 1.5,
			},
		])

		const { users: users3 } = await client.request<any>(graphql.users, {
			where: {
				floatValue: { equalTo: 1.5 },
			},
		})

		expect(users3).toEqual([
			{
				id: expect.any(String),
				name: 'Lucas',
				age: 20,
				isAdmin: true,
				floatValue: 1.5,
			},
		])

		const { users: users4 } = await client.request<any>(graphql.users, {
			where: {
				name: { equalTo: 'Lucas' },
			},
		})

		expect(users4).toEqual([
			{
				id: expect.any(String),
				name: 'Lucas',
				age: 20,
				isAdmin: true,
				floatValue: 1.5,
			},
		])
	})

	it('should support notEqualTo for each wibe scalar', async () => {
		const { users } = await client.request<any>(graphql.users, {
			where: {
				age: { notEqualTo: 20 },
			},
		})

		expect(users).toEqual([
			{
				id: expect.any(String),
				name: 'Jeanne',
				age: 18,
				isAdmin: false,
				floatValue: 2.5,
			},
		])

		const { users: users2 } = await client.request<any>(graphql.users, {
			where: {
				isAdmin: { notEqualTo: true },
			},
		})

		expect(users2).toEqual([
			{
				id: expect.any(String),
				name: 'Jeanne',
				age: 18,
				isAdmin: false,
				floatValue: 2.5,
			},
		])

		const { users: users3 } = await client.request<any>(graphql.users, {
			where: {
				floatValue: { notEqualTo: 1.5 },
			},
		})

		expect(users3).toEqual([
			{
				id: expect.any(String),
				name: 'Jeanne',
				age: 18,
				isAdmin: false,
				floatValue: 2.5,
			},
		])

		const { users: users4 } = await client.request<any>(graphql.users, {
			where: {
				name: { notEqualTo: 'Lucas' },
			},
		})

		expect(users4).toEqual([
			{
				id: expect.any(String),
				name: 'Jeanne',
				age: 18,
				isAdmin: false,
				floatValue: 2.5,
			},
		])
	})

	it('should support lessThan for each wibe scalar', async () => {
		const { users } = await client.request<any>(graphql.users, {
			where: {
				age: { lessThan: 20 },
			},
		})

		expect(users).toEqual([
			{
				id: expect.any(String),
				name: 'Jeanne',
				age: 18,
				isAdmin: false,
				floatValue: 2.5,
			},
		])

		const { users: users2 } = await client.request<any>(graphql.users, {
			where: {
				floatValue: { lessThan: 2.5 },
			},
		})

		expect(users2).toEqual([
			{
				id: expect.any(String),
				name: 'Lucas',
				age: 20,
				isAdmin: true,
				floatValue: 1.5,
			},
		])
	})

	it('should support lessThanOrEqualTo for each wibe scalar', async () => {
		const { users } = await client.request<any>(graphql.users, {
			where: {
				age: { lessThanOrEqualTo: 20 },
			},
		})

		expect(users).toEqual([
			{
				id: expect.any(String),
				name: 'Lucas',
				age: 20,
				isAdmin: true,
				floatValue: 1.5,
			},
			{
				id: expect.any(String),
				name: 'Jeanne',
				age: 18,
				isAdmin: false,
				floatValue: 2.5,
			},
		])

		const { users: users2 } = await client.request<any>(graphql.users, {
			where: {
				floatValue: { lessThanOrEqualTo: 2.5 },
			},
		})

		expect(users2).toEqual([
			{
				id: expect.any(String),
				name: 'Lucas',
				age: 20,
				isAdmin: true,
				floatValue: 1.5,
			},
			{
				id: expect.any(String),
				name: 'Jeanne',
				age: 18,
				isAdmin: false,
				floatValue: 2.5,
			},
		])
	})

	it('should support greaterThan for each wibe scalar', async () => {
		const { users } = await client.request<any>(graphql.users, {
			where: {
				age: { greaterThan: 18 },
			},
		})

		expect(users).toEqual([
			{
				id: expect.any(String),
				name: 'Lucas',
				age: 20,
				isAdmin: true,
				floatValue: 1.5,
			},
		])

		const { users: users2 } = await client.request<any>(graphql.users, {
			where: {
				floatValue: { greaterThan: 1.5 },
			},
		})

		expect(users2).toEqual([
			{
				id: expect.any(String),
				name: 'Jeanne',
				age: 18,
				isAdmin: false,
				floatValue: 2.5,
			},
		])
	})

	it('should support greaterThanOrEqualTo for each wibe scalar', async () => {
		const { users } = await client.request<any>(graphql.users, {
			where: {
				age: { greaterThanOrEqualTo: 18 },
			},
		})

		expect(users).toEqual([
			{
				id: expect.any(String),
				name: 'Lucas',
				age: 20,
				isAdmin: true,
				floatValue: 1.5,
			},
			{
				id: expect.any(String),
				name: 'Jeanne',
				age: 18,
				isAdmin: false,
				floatValue: 2.5,
			},
		])

		const { users: users2 } = await client.request<any>(graphql.users, {
			where: {
				floatValue: { greaterThanOrEqualTo: 2.5 },
			},
		})

		expect(users2).toEqual([
			{
				id: expect.any(String),
				name: 'Jeanne',
				age: 18,
				isAdmin: false,
				floatValue: 2.5,
			},
		])
	})
})
