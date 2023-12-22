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
import {
	closeTests,
	getGraphqlClient,
	setupTests,
} from '../../utils/testHelper'
import { GraphQLClient } from 'graphql-request'
import { Role } from '../../../generated/wibe'

const graphql = {
	customQuery: gql`
		query customQuery($name: String!) {
			customQuery(name: $name)
		}
	`,
	customMutation: gql`
		mutation customMutation($a: Int!, $b: Int!) {
			customMutation(a: $a, b: $b)
		}
	`,
	user: gql`
		query user($id: ID!) {
			user(id: $id) {
				id
				name
				age
			}
		}
	`,
	users: gql`
		query users($where: UserWhereInput) {
			users(where: $where) {
				id
				name
				age
			}
		}
	`,
	createUser: gql`
		mutation createUser($name: String!, $age: Int!) {
			createUser(input: { name: $name, age: $age }) {
				id
				name
				age
			}
		}
	`,
	createUsers: gql`
		mutation createUsers($input: [UserInput]) {
			createUsers(input: $input) {
				name
				age
			}
		}
	`,
	updateUser: gql`
		mutation updateUser($input: UserUpdateInput!) {
			updateUser(input: $input) {
				name
				age
			}
		}
	`,
	updateUsers: gql`
		mutation updateUsers($input: UsersUpdateInput!) {
			updateUsers(input: $input) {
				name
				age
			}
		}
	`,
	deleteUser: gql`
		mutation deleteUser($input: UserDeleteInput!) {
			deleteUser(input: $input) {
				name
				age
			}
		}
	`,
	deleteUsers: gql`
		mutation deleteUsers($input: UsersDeleteInput!) {
			deleteUsers(input: $input) {
				name
				age
			}
		}
	`,
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

	beforeEach(async () => {
		await client.request<any>(graphql.createUsers, {
			input: [
				{ name: 'Lucas', age: 23 },
				{ name: 'Jeanne', age: 23 },
			],
		})
	})

	afterEach(async () => {
		const { users } = await client.request<any>(graphql.users, {})

		await Promise.all(
			users.map((user: any) =>
				client.request<any>(graphql.deleteUser, {
					input: { id: user.id },
				}),
			),
		)
	})

	afterAll(async () => {
		await closeTests(wibe)
	})

	it('should create user with custom object in schema', async () => {
		await client.request<any>(graphql.createUsers, {
			input: [
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
				{ name: 'Jeanne', age: 23 },
			],
		})

		const { users } = await client.request<any>(graphql.users, {
			where: {
				address: {
					address1: {
						equalTo: '1 rue de la paix',
					},
				},
			},
		})

		expect(users.length).toEqual(1)
		expect(users[0].name).toEqual('Jean')

		const { users: users2 } = await client.request<any>(graphql.users, {
			where: {
				address: {
					postalCode: {
						equalTo: 75000,
					},
				},
			},
		})

		expect(users2.length).toEqual(1)
		expect(users2[0].name).toEqual('Jean')

		const { users: users3 } = await client.request<any>(graphql.users, {
			where: {
				address: {
					address1: {
						notEqualTo: '1 rue de la paix',
					},
				},
			},
		})

		expect(users3.length).toEqual(3)
	})

	it('should create user with object of object in schema', async () => {
		await client.request<any>(graphql.createUsers, {
			input: [
				{
					name: 'Jean',
					object: {
						objectOfObject: {
							name: 'object',
						},
					},
				},
			],
		})

		const { users } = await client.request<any>(graphql.users, {
			where: {
				object: {
					objectOfObject: {
						name: { equalTo: 'object' },
					},
				},
			},
		})

		expect(users.length).toEqual(1)
		expect(users[0].name).toEqual('Jean')

		const { users: users2 } = await client.request<any>(graphql.users, {
			where: {
				object: {
					objectOfObject: {
						name: { equalTo: 'object2' },
					},
				},
			},
		})

		expect(users2.length).toEqual(0)

		const { users: users3 } = await client.request<any>(graphql.users, {
			where: {
				object: {
					objectOfObject: {
						name: { notEqualTo: 'object' },
					},
				},
			},
		})

		expect(users3.length).toEqual(2)
	})

	it('should create user with custom enum (Role)', async () => {
		await client.request<any>(graphql.createUsers, {
			input: [{ name: 'Jack', role: Role.Admin }],
		})

		const { users } = await client.request<any>(graphql.users, {
			where: {
				role: {
					equalTo: Role.Admin,
				},
			},
		})

		expect(users.length).toEqual(1)
		expect(users[0].name).toEqual('Jack')

		const { users: users2 } = await client.request<any>(graphql.users, {
			where: {
				role: {
					notEqualTo: Role.Admin,
				},
			},
		})

		expect(users2.length).toEqual(2)
		expect(users2).toEqual([
			{
				id: expect.anything(),
				name: 'Lucas',
				age: 23,
			},
			{
				id: expect.anything(),
				name: 'Jeanne',
				age: 23,
			},
		])
	})

	it('should create user with a custom scalar (phone)', async () => {
		await client.request<any>(graphql.createUsers, {
			input: [{ name: 'Jack', phone: '+33577223355' }],
		})

		const { users } = await client.request<any>(graphql.users, {
			where: {
				phone: {
					equalTo: '+33577223355',
				},
			},
		})

		expect(users.length).toEqual(1)
		expect(users[0].name).toEqual('Jack')

		const { users: users2 } = await client.request<any>(graphql.users, {
			where: {
				phone: {
					notEqualTo: '+33577223355',
				},
			},
		})

		expect(users2.length).toEqual(2)
		expect(users2).toEqual([
			{
				id: expect.anything(),
				name: 'Lucas',
				age: 23,
			},
			{
				id: expect.anything(),
				name: 'Jeanne',
				age: 23,
			},
		])
	})

	it('should create custom query successfully', async () => {
		// Test required field
		expect(client.request<any>(graphql.customQuery, {})).rejects.toThrow()

		// Test String param is correctly passed
		expect(
			client.request<any>(graphql.customMutation, {
				name: 1.5,
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
				a: 1.5,
				b: 1.5,
			}),
		).rejects.toThrow()

		const res = await client.request<any>(graphql.customMutation, {
			a: 1,
			b: 1,
		})

		expect(res.customMutation).toEqual(2)
	})

	it('should throw an error if a field is required and not provided', async () => {
		expect(
			client.request<any>(graphql.createUsers, {
				input: [{ age: 23 }],
			}),
		).rejects.toThrow()
	})

	it('should get an object that not exist', async () => {
		expect(
			await client.request<any>(graphql.user, {
				id: '65356f69ea1fe46431076723',
			}),
		).toEqual({ user: null })
	})

	it('should get an object', async () => {
		const res = await client.request<any>(graphql.createUser, {
			name: 'CurrentUser',
			age: 99,
		})

		const { user } = await client.request<any>(graphql.user, {
			id: res.createUser.id,
		})

		expect(user).toEqual({
			id: res.createUser.id,
			name: 'CurrentUser',
			age: 99,
		})
	})

	it('should get multiple objects', async () => {
		const res = await client.request<any>(graphql.users, {
			input: {
				where: {
					name: {
						equalTo: 'Lucas',
					},
				},
			},
		})

		expect(res.users).toEqual([
			{
				id: expect.anything(),
				name: 'Lucas',
				age: 23,
			},
			{
				id: expect.anything(),
				name: 'Jeanne',
				age: 23,
			},
		])
	})

	it('should create an object', async () => {
		const res = await client.request<any>(graphql.createUser, {
			name: 'John',
			age: 23,
		})

		expect(res.createUser).toEqual({
			id: expect.anything(),
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
				id: expect.anything(),
				name: 'John',
				age: 23,
			},
		])
	})

	it('should create multiple objects', async () => {
		const res = await client.request<any>(graphql.createUsers, {
			input: [
				{ name: 'Lucas2', age: 24 },
				{ name: 'Jeanne2', age: 24 },
			],
		})

		expect(res.createUsers).toEqual([
			{ name: 'Lucas2', age: 24 },
			{ name: 'Jeanne2', age: 24 },
		])

		const users = await client.request<any>(graphql.users, {
			where: {
				name: {
					equalTo: 'Lucas2',
				},
			},
		})

		expect(users.users).toEqual([
			{ id: expect.anything(), name: 'Lucas2', age: 24 },
		])

		const users2 = await client.request<any>(graphql.users, {
			where: {
				age: {
					equalTo: 24,
				},
			},
		})

		expect(users2.users).toEqual([
			{ id: expect.anything(), name: 'Lucas2', age: 24 },
			{ id: expect.anything(), name: 'Jeanne2', age: 24 },
		])
	})

	it('should update one object', async () => {
		const { users } = await client.request<any>(graphql.users, {})

		const userToUpdate = users[0]

		const res = await client.request<any>(graphql.updateUser, {
			input: {
				id: userToUpdate.id,
				fields: {
					name: 'NameAfterUpdate',
				},
			},
		})

		expect(res.updateUser).toEqual({
			name: 'NameAfterUpdate',
			age: userToUpdate.age,
		})
	})

	it('should update multiple objects', async () => {
		const res = await client.request<any>(graphql.updateUsers, {
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

		expect(res.updateUsers).toEqual([
			{
				name: 'Tata',
				age: 23,
			},
		])
	})

	it('should delete one object', async () => {
		const { users } = await client.request<any>(graphql.users, {})

		const userToDelete = users[0]

		expect(users.length).toEqual(2)

		const res = await client.request<any>(graphql.deleteUser, {
			input: {
				id: userToDelete.id,
			},
		})

		expect(res.deleteUser).toEqual({
			name: userToDelete.name,
			age: userToDelete.age,
		})

		const { users: users2 } = await client.request<any>(graphql.users, {})

		expect(users2.length).toEqual(1)
	})

	it('should delete multiple objects', async () => {
		const res = await client.request<any>(graphql.deleteUsers, {
			input: {
				where: {
					age: {
						equalTo: 23,
					},
				},
			},
		})

		expect(res.deleteUsers).toEqual([
			{
				name: 'Lucas',
				age: 23,
			},
			{
				name: 'Jeanne',
				age: 23,
			},
		])

		const { users } = await client.request<any>(graphql.users, {})

		expect(users.length).toEqual(0)
	})
})
