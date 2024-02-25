import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
} from 'bun:test'
import { WibeApp } from '../../server'
import { gql } from '@elysiajs/apollo'
import { closeTests, getGraphqlClient, setupTests } from '../../utils/helper'
import { GraphQLClient } from 'graphql-request'

const cleanUsers = async (client: GraphQLClient) => {
	const { _users } = await client.request<any>(graphql._users, {})
	await Promise.all(
		_users.edges.map(({ node }: { node: any }) =>
			client.request<any>(graphql.delete_User, {
				input: { id: node.id },
			}),
		),
	)
}

describe('GraphQL : E2E', () => {
	let wibe: WibeApp
	let port: number
	let client: GraphQLClient

	beforeAll(async () => {
		const setup = await setupTests()
		wibe = setup.wibe
		port = setup.port
		client = getGraphqlClient(port)
	})

	afterAll(async () => {
		await closeTests(wibe)
	})

	describe('Default requests', () => {
		beforeEach(async () => {
			await client.request<any>(graphql.create_Users, {
				input: {
					fields: [
						{ name: 'Lucas', age: 23 },
						{ name: 'Jeanne', age: 23 },
					],
				},
			})
		})

		afterEach(async () => {
			await cleanUsers(client)
		})

		it("should use pagination with 'offset' and 'limit' arguments", async () => {
			await cleanUsers(client)

			const res = await client.request<any>(graphql.create_Users, {
				input: {
					fields: [
						{
							name: 'Toto1',
						},
						{ name: 'Toto2' },
						{ name: 'Toto3' },
						{ name: 'Toto4' },
						{ name: 'Toto5' },
						{ name: 'Toto6' },
						{ name: 'Toto7' },
						{ name: 'Toto8' },
						{ name: 'Toto9' },
						{ name: 'Toto10' },
					],
					offset: 0,
					limit: 5,
				},
			})

			expect(res.create_Users.edges.length).toEqual(5)

			const { _users } = await client.request<any>(graphql._users, {
				offset: 5,
				limit: 2,
			})

			expect(_users.edges.length).toEqual(2)
			expect(_users.edges[0].node.name).toEqual('Toto6')
		})

		it('should request sub sub object', async () => {
			await client.request<any>(graphql.create_Users, {
				input: {
					fields: {
						authentication: {
							emailPassword: {
								identifier: 'email@test.fr',
								password: 'password',
							},
						},
					},
				},
			})

			const res = await client.request<any>(graphql._users, {
				where: {
					authentication: {
						emailPassword: {
							identifier: { equalTo: 'email@test.fr' },
						},
					},
				},
			})

			expect(res._users.edges.length).toEqual(1)
		})

		it('should create user with custom object in schema', async () => {
			await client.request<any>(graphql.create_Users, {
				input: {
					fields: [
						{
							name: 'Jean',
							address: {
								address1: '1 rue de la paix',
								address2: '2 rue de la paix',
								postalCode: 75000,
								city: 'Paris',
								country: 'France',
							},
						},
						{
							name: 'Jeanne',
							age: 23,
						},
					],
				},
			})

			const { _users } = await client.request<any>(graphql._users, {
				where: {
					address: {
						address1: {
							equalTo: '1 rue de la paix',
						},
					},
				},
			})

			expect(_users.edges.length).toEqual(1)
			expect(_users.edges[0].node.name).toEqual('Jean')

			const { _users: users2 } = await client.request<any>(
				graphql._users,
				{
					where: {
						address: {
							postalCode: {
								equalTo: 75000,
							},
						},
					},
				},
			)

			expect(users2.edges.length).toEqual(1)
			expect(users2.edges[0].node.name).toEqual('Jean')

			const { _users: users3 } = await client.request<any>(
				graphql._users,
				{
					where: {
						address: {
							address1: {
								notEqualTo: '1 rue de la paix',
							},
						},
					},
				},
			)

			expect(users3.edges.length).toEqual(3)
		})

		it('should create user with object of object in schema', async () => {
			await client.request<any>(graphql.create_Users, {
				input: {
					fields: [
						{
							name: 'Jean',
							object: {
								objectOfObject: {
									name: 'object',
								},
							},
						},
					],
				},
			})

			const { _users } = await client.request<any>(graphql._users, {
				where: {
					object: {
						objectOfObject: {
							name: { equalTo: 'object' },
						},
					},
				},
			})

			expect(_users.edges.length).toEqual(1)
			expect(_users.edges[0].node.name).toEqual('Jean')

			const { _users: users2 } = await client.request<any>(
				graphql._users,
				{
					where: {
						object: {
							objectOfObject: {
								name: { equalTo: 'object2' },
							},
						},
					},
				},
			)

			expect(users2.edges.length).toEqual(0)

			const { _users: users3 } = await client.request<any>(
				graphql._users,
				{
					where: {
						object: {
							objectOfObject: {
								name: { notEqualTo: 'object' },
							},
						},
					},
				},
			)

			expect(users3.edges.length).toEqual(2)
		})

		it('should create user with custom enum (Role)', async () => {
			await client.request<any>(graphql.create_Users, {
				input: {
					fields: [{ name: 'Jack', role: 'Admin' }],
				},
			})

			const { _users } = await client.request<any>(graphql._users, {
				where: {
					role: {
						equalTo: 'Admin',
					},
				},
			})

			expect(_users.edges.length).toEqual(1)
			expect(_users.edges[0].node.name).toEqual('Jack')

			const { _users: users2 } = await client.request<any>(
				graphql._users,
				{
					where: {
						role: {
							notEqualTo: 'Admin',
						},
					},
				},
			)

			expect(users2.edges.length).toEqual(2)
			expect(users2.edges).toEqual([
				{
					node: {
						id: expect.anything(),
						name: 'Lucas',
						age: 23,
					},
				},
				{
					node: {
						id: expect.anything(),
						name: 'Jeanne',
						age: 23,
					},
				},
			])
		})

		it('should create user with a custom scalar (phone)', async () => {
			await client.request<any>(graphql.create_Users, {
				input: {
					fields: [
						{
							name: 'Jack',
							phone: '+33577223355',
						},
					],
				},
			})

			const { _users } = await client.request<any>(graphql._users, {
				where: {
					phone: {
						equalTo: '+33577223355',
					},
				},
			})

			expect(_users.edges.length).toEqual(1)
			expect(_users.edges[0].node.name).toEqual('Jack')

			const { _users: users2 } = await client.request<any>(
				graphql._users,
				{
					where: {
						phone: {
							notEqualTo: '+33577223355',
						},
					},
				},
			)

			expect(users2.edges.length).toEqual(2)
			expect(users2.edges).toEqual([
				{
					node: {
						id: expect.anything(),
						name: 'Lucas',
						age: 23,
					},
				},
				{
					node: {
						id: expect.anything(),
						name: 'Jeanne',
						age: 23,
					},
				},
			])
		})

		it('should create custom query successfully', async () => {
			// Test required field
			expect(
				client.request<any>(graphql.customQuery, {}),
			).rejects.toThrow()

			// Test String param is correctly passed
			expect(
				client.request<any>(graphql.customMutation, {
					input: {
						name: 1.5,
					},
				}),
			).rejects.toThrow()

			const res = await client.request<any>(graphql.customQuery, {
				name: 'Lucas',
			})

			expect(res.customQuery).toEqual('Successfull')
		})

		it('should create custom mutation successfully', async () => {
			// Test required field
			expect(
				client.request<any>(graphql.customMutation, {}),
			).rejects.toThrow()

			// Test Int param is correctly passed
			expect(
				client.request<any>(graphql.customMutation, {
					input: {
						a: 1.5,
						b: 1.5,
					},
				}),
			).rejects.toThrow()

			const res = await client.request<any>(graphql.customMutation, {
				input: {
					a: 1,
					b: 1,
				},
			})

			expect(res.customMutation).toEqual(2)
		})

		it('should create recursive mutation correctly (with sub input)', async () => {
			expect(
				client.request<any>(graphql.secondCustomMutation, {
					input: {
						a: 1,
						b: 1,
					},
				}),
			).rejects.toThrow()

			const res = await client.request<any>(
				graphql.secondCustomMutation,
				{
					input: {
						sum: {
							a: 1,
							b: 1,
						},
					},
				},
			)

			expect(res.secondCustomMutation).toEqual(2)

			const res2 = await client.request<any>(
				graphql.thirdCustomMutation,
				{
					input: {
						subObject: {
							sum: {
								a: 1,
								b: 1,
							},
						},
					},
				},
			)

			expect(res2.thirdCustomMutation).toEqual(2)
		})

		it('should get an object that not exist', async () => {
			expect(
				await client.request<any>(graphql._user, {
					id: '65356f69ea1fe46431076723',
				}),
			).toEqual({ _user: null })
		})

		it('should get an object', async () => {
			const res = await client.request<any>(graphql.create_User, {
				input: {
					fields: {
						name: 'CurrentUser',
						age: 99,
					},
				},
			})

			const { _user } = await client.request<any>(graphql._user, {
				id: res.create_User.id,
			})

			expect(_user).toEqual({
				id: res.create_User.id,
				name: 'CurrentUser',
				age: 99,
			})
		})

		it('should get multiple objects', async () => {
			const res = await client.request<any>(graphql._users, {
				input: {
					where: {
						name: {
							equalTo: 'Lucas',
						},
					},
				},
			})

			expect(res._users.edges).toEqual([
				{
					node: {
						id: expect.anything(),
						name: 'Lucas',
						age: 23,
					},
				},
				{
					node: {
						id: expect.anything(),
						name: 'Jeanne',
						age: 23,
					},
				},
			])
		})

		it('should create an object', async () => {
			const res = await client.request<any>(graphql.create_User, {
				input: {
					fields: {
						name: 'John',
						age: 23,
					},
				},
			})

			expect(res.create_User).toEqual({
				id: expect.anything(),
				name: 'John',
				age: 23,
			})

			expect(
				(
					await client.request<any>(graphql._users, {
						where: {
							name: {
								equalTo: 'John',
							},
						},
					})
				)._users.edges,
			).toEqual([
				{
					node: {
						id: expect.anything(),
						name: 'John',
						age: 23,
					},
				},
			])
		})

		it('should create multiple objects', async () => {
			const res = await client.request<any>(graphql.create_Users, {
				input: {
					fields: [
						{ name: 'Lucas2', age: 24 },
						{ name: 'Jeanne2', age: 24 },
					],
				},
			})

			expect(res.create_Users.edges).toEqual([
				{ node: { name: 'Lucas2', age: 24 } },
				{ node: { name: 'Jeanne2', age: 24 } },
			])

			const { _users } = await client.request<any>(graphql._users, {
				where: {
					name: {
						equalTo: 'Lucas2',
					},
				},
			})

			expect(_users.edges).toEqual([
				{ node: { id: expect.anything(), name: 'Lucas2', age: 24 } },
			])

			const users2 = await client.request<any>(graphql._users, {
				where: {
					age: {
						equalTo: 24,
					},
				},
			})

			expect(users2._users.edges).toEqual([
				{ node: { id: expect.anything(), name: 'Lucas2', age: 24 } },
				{ node: { id: expect.anything(), name: 'Jeanne2', age: 24 } },
			])
		})

		it('should update one object', async () => {
			const { _users } = await client.request<any>(graphql._users, {})

			const userToUpdate = _users.edges[0].node

			const res = await client.request<any>(graphql.update_User, {
				input: {
					id: userToUpdate.id,
					fields: {
						name: 'NameAfterUpdate',
					},
				},
			})

			expect(res.update_User).toEqual({
				name: 'NameAfterUpdate',
				age: userToUpdate.age,
			})
		})

		it('should update multiple objects', async () => {
			const res = await client.request<any>(graphql.update_Users, {
				input: {
					fields: {
						name: 'Tata',
					},
					where: {
						name: {
							equalTo: 'Lucas',
						},
					},
				},
			})

			expect(res.update_Users.edges).toEqual([
				{
					node: {
						name: 'Tata',
						age: 23,
					},
				},
			])
		})

		it('should delete one object', async () => {
			const { _users } = await client.request<any>(graphql._users, {})

			const userToDelete = _users.edges[0].node

			expect(_users.edges.length).toEqual(2)

			const res = await client.request<any>(graphql.delete_User, {
				input: {
					id: userToDelete.id,
				},
			})

			expect(res.delete_User).toEqual({
				name: userToDelete.name,
				age: userToDelete.age,
			})

			const { _users: users2 } = await client.request<any>(
				graphql._users,
				{},
			)

			expect(users2.edges.length).toEqual(1)
		})

		it('should delete multiple objects', async () => {
			const res = await client.request<any>(graphql.delete_Users, {
				input: {
					where: {
						age: {
							equalTo: 23,
						},
					},
				},
			})

			expect(res.delete_Users.edges).toEqual([
				{
					node: {
						name: 'Lucas',
						age: 23,
					},
				},
				{
					node: {
						name: 'Jeanne',
						age: 23,
					},
				},
			])

			const { _users } = await client.request<any>(graphql._users, {})

			expect(_users.edges.length).toEqual(0)
		})
	})

	describe.only('Authentication mutations', () => {
		it('should signIn with emailPassword', async () => {
			const { signInWith } = await client.request<any>(
				graphql.signInWith,
				{
					input: {
						authentication: {
							emailPassword: {
								identifier: 'email@test.fr',
								password: 'password',
							},
						},
					},
				},
			)

			expect(signInWith).toEqual(true)

			const { signInWith: signInWith2 } = await client.request<any>(
				graphql.signInWith,
				{
					input: {
						authentication: {
							emailPassword: {
								identifier: 'email@test.fr',
								password: 'invalidpassword',
							},
						},
					},
				},
			)

			expect(signInWith2).toEqual(false)
		})
	})
})

const graphql = {
	signInWith: gql`
		mutation signInWith($input: SignInWithInput!) {
			signInWith(input: $input)
		}
	`,
	customQuery: gql`
		query customQuery($name: String!) {
			customQuery(name: $name)
		}
	`,
	customMutation: gql`
		mutation customMutation($input: CustomMutationInput!) {
			customMutation(input: $input)
		}
	`,
	secondCustomMutation: gql`
		mutation secondCustomMutation($input: SecondCustomMutationInput!) {
			secondCustomMutation(input: $input)
		}
	`,
	thirdCustomMutation: gql`
		mutation thirdCustomMutation($input: ThirdCustomMutationInput!) {
			thirdCustomMutation(input: $input)
		}
	`,
	_user: gql`
		query _user($id: ID!) {
			_user(id: $id) {
				id
				name
				age
			}
		}
	`,
	_users: gql`
		query _users($where: _UserWhereInput, $offset: Int, $limit: Int) {
			_users(where: $where, offset: $offset, limit: $limit) {
				edges {
					node {
						id
						name
						age
					}
				}
			}
		}
	`,
	create_User: gql`
		mutation create_User($input: _UserCreateInput!) {
			create_User(input: $input) {
				id
				name
				age
			}
		}
	`,
	create_Users: gql`
		mutation create_Users($input: _UsersCreateInput!) {
			create_Users(input: $input) {
				edges {
					node {
						name
						age
					}
				}
			}
		}
	`,
	update_User: gql`
		mutation update_User($input: _UserUpdateInput!) {
			update_User(input: $input) {
				name
				age
			}
		}
	`,
	update_Users: gql`
		mutation update_Users($input: _UsersUpdateInput!) {
			update_Users(input: $input) {
				edges {
					node {
						name
						age
					}
				}
			}
		}
	`,
	delete_User: gql`
		mutation delete_User($input: _UserDeleteInput!) {
			delete_User(input: $input) {
				name
				age
			}
		}
	`,
	delete_Users: gql`
		mutation delete_Users($input: _UsersDeleteInput!) {
			delete_Users(input: $input) {
				edges {
					node {
						name
						age
					}
				}
			}
		}
	`,
}
