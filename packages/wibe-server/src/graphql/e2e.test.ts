import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { WibeApp } from '../server'
import { gql } from '@elysiajs/apollo'
import { closeTests, getGraphqlClient, setupTests } from '../utils/testHelper'
import { GraphQLClient } from 'graphql-request'

const graphql = {
	user: gql`
		query user($id: String!) {
			user(id: $id) {
				name
				age
			}
		}
	`,
	users: gql`
		query users($where: UserWhereInput) {
			users(where: $where) {
				name
				age
			}
		}
	`,
	createUser: gql`
		mutation createUser($name: String!, $age: Int!) {
			createUser(input: { name: $name, age: $age }) {
				name
				age
			}
		}
	`,
	createUsers: gql`
		mutation createUsers($input: [UserCreateInput]) {
			createUsers(input: $input) {
				name
				age
			}
		}
	`,
}

describe('GraphQL Queries', () => {
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
				{ name: 'Lucas', age: 23 },
				{ name: 'Jeanne', age: 23 },
			],
		})
	})

	afterAll(async () => {
		await closeTests(wibe)
	})

	it('should get an object that not exist', async () => {
		expect(
			await client.request<any>(graphql.user, {
				id: '65356f69ea1fe46431076723',
			}),
		).toEqual({ user: null })
	})

	it('should create an object', async () => {
		const res = await client.request<any>(graphql.createUser, {
			name: 'John',
			age: 23,
		})

		expect(res.createUser).toEqual({
			name: 'John',
			age: 23,
		})

		expect(
			(
				await client.request<any>(graphql.users, {
					where: {
						name: {
							equalTo: 'John',
						},
					},
				})
			).users,
		).toEqual([
			{
				name: 'John',
				age: 23,
			},
		])
	})
})
