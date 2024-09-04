import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'bun:test'
import type { Wabe } from '../../server'
import {
  type DevWabeTypes,
  closeTests,
  getGraphqlClient,
  setupTests,
} from '../../utils/helper'
import { type GraphQLClient, gql } from 'graphql-request'

const cleanUsers = async (client: GraphQLClient) => {
  const { users } = await client.request<any>(graphql.users, {})
  await Promise.all(
    users.edges.map(({ node }: { node: any }) =>
      client.request<any>(graphql.deleteUser, {
        input: { id: node.id },
      }),
    ),
  )
}

describe('GraphQL : E2E', () => {
  let wabe: Wabe<DevWabeTypes>
  let port: number
  let client: GraphQLClient

  beforeAll(async () => {
    const setup = await setupTests()
    wabe = setup.wabe
    port = setup.port
    client = getGraphqlClient(port)
  })

  afterAll(async () => {
    await closeTests(wabe)
  })

  beforeEach(async () => {
    await client.request<any>(graphql.createUsers, {
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

  describe('Default requests', () => {
    it("should use pagination with 'offset' and 'first' arguments", async () => {
      await cleanUsers(client)

      const res = await client.request<any>(graphql.createUsers, {
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
          first: 5,
        },
      })

      expect(res.createUsers.edges.length).toEqual(5)

      const { users } = await client.request<any>(graphql.users, {
        offset: 5,
        first: 2,
      })

      expect(users.edges.length).toEqual(2)
      expect(users.edges[0].node.name).toEqual('Toto6')
    })

    it('should create user with a custom scalar (phone)', async () => {
      await client.request<any>(graphql.createUsers, {
        input: {
          fields: [
            {
              name: 'Jack',
              phone: '+33577223355',
            },
          ],
        },
      })

      const { users } = await client.request<any>(graphql.users, {
        where: {
          phone: {
            equalTo: '+33577223355',
          },
        },
      })

      expect(users.edges.length).toEqual(1)
      expect(users.edges[0].node.name).toEqual('Jack')

      const { users: users2 } = await client.request<any>(graphql.users, {
        where: {
          phone: {
            notEqualTo: '+33577223355',
          },
        },
      })

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

    it("should throw an error object not found if the object doesn't exist", async () => {
      expect(
        client.request<any>(graphql.user, {
          id: '65356f69ea1fe46431076723',
        }),
      ).rejects.toThrow('Object not found')
    })

    it('should get an object', async () => {
      const res = await client.request<any>(graphql.createUser, {
        input: {
          fields: {
            name: 'CurrentUser',
            age: 99,
          },
        },
      })

      const { user } = await client.request<any>(graphql.user, {
        id: res.createUser.user.id,
      })

      expect(user).toEqual({
        id: res.createUser.user.id,
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

      expect(res.users.edges).toEqual([
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
      const res = await client.request<any>(graphql.createUser, {
        input: {
          fields: {
            name: 'John',
            age: 23,
          },
        },
      })

      expect(res.createUser.user).toEqual({
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
        ).users.edges,
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
      const res = await client.request<any>(graphql.createUsers, {
        input: {
          fields: [
            { name: 'Lucas2', age: 24 },
            { name: 'Jeanne2', age: 24 },
          ],
        },
      })

      expect(res.createUsers.edges).toEqual([
        { node: { name: 'Lucas2', age: 24 } },
        { node: { name: 'Jeanne2', age: 24 } },
      ])

      const { users } = await client.request<any>(graphql.users, {
        where: {
          name: {
            equalTo: 'Lucas2',
          },
        },
      })

      expect(users.edges).toEqual([
        { node: { id: expect.anything(), name: 'Lucas2', age: 24 } },
      ])

      const users2 = await client.request<any>(graphql.users, {
        where: {
          age: {
            equalTo: 24,
          },
        },
      })

      expect(users2.users.edges).toEqual([
        { node: { id: expect.anything(), name: 'Lucas2', age: 24 } },
        { node: { id: expect.anything(), name: 'Jeanne2', age: 24 } },
      ])
    })

    it('should update one object', async () => {
      const { users } = await client.request<any>(graphql.users, {})

      const userToUpdate = users.edges[0].node

      const res = await client.request<any>(graphql.updateUser, {
        input: {
          id: userToUpdate.id,
          fields: {
            name: 'NameAfterUpdate',
          },
        },
      })

      expect(res.updateUser.user).toEqual({
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

      expect(res.updateUsers.edges).toEqual([
        {
          node: {
            name: 'Tata',
            age: 23,
          },
        },
      ])
    })

    it('should delete one object', async () => {
      const { users } = await client.request<any>(graphql.users, {})

      const userToDelete = users.edges[0].node

      expect(users.edges.length).toEqual(2)

      const res = await client.request<any>(graphql.deleteUser, {
        input: {
          id: userToDelete.id,
        },
      })

      expect(res.deleteUser.user).toEqual({
        name: userToDelete.name,
        age: userToDelete.age,
      })

      const { users: users2 } = await client.request<any>(graphql.users, {})

      expect(users2.edges.length).toEqual(1)
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

      expect(res.deleteUsers.edges).toEqual([
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

      const { users } = await client.request<any>(graphql.users, {})

      expect(users.edges.length).toEqual(0)
    })
  })

  describe('Authentication mutations', () => {
    it('should signIn with emailPassword if the password is correct', async () => {
      const { signUpWith } = await client.request<any>(graphql.signUpWith, {
        input: {
          authentication: {
            emailPassword: {
              email: 'email@test.fr',
              password: 'password',
            },
          },
        },
      })

      expect(signUpWith).toEqual({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      })

      const { signInWith: signInWith2 } = await client.request<any>(
        graphql.signInWith,
        {
          input: {
            authentication: {
              emailPassword: {
                email: 'email@test.fr',
                password: 'password',
              },
            },
          },
        },
      )

      expect(signInWith2).toEqual({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      })
    })
  })

  it('should not signIn with emailPassword if the password is incorrect', async () => {
    expect(
      client.request<any>(graphql.signInWith, {
        input: {
          authentication: {
            emailPassword: {
              email: 'email@test.fr',
              password: 'password',
            },
          },
        },
      }),
    ).rejects.toThrow('Invalid authentication credentials')

    await client.request<any>(graphql.signUpWith, {
      input: {
        authentication: {
          emailPassword: {
            email: 'email@test.fr',
            password: 'password',
          },
        },
      },
    })

    expect(
      client.request<any>(graphql.signInWith, {
        input: {
          authentication: {
            emailPassword: {
              email: 'email@test.fr',
              password: 'invalidpassword',
            },
          },
        },
      }),
    ).rejects.toThrow('Invalid authentication credentials')
  })
})

const graphql = {
  signUpWith: gql`
		mutation signUpWith($input: SignUpWithInput!) {
			signUpWith(input: $input){
				accessToken
				refreshToken
			}
		}
	`,
  signInWith: gql`
		mutation signInWith($input: SignInWithInput!) {
			signInWith(input: $input){
				accessToken
				refreshToken
			}
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
		query users($where: UserWhereInput, $offset: Int, $first: Int) {
			users(where: $where, offset: $offset, first: $first) {
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
  createUser: gql`
		mutation createUser($input: CreateUserInput!) {
			createUser(input: $input) {
				user {
					id
					name
					age
				}
			}
		}
	`,
  createUsers: gql`
		mutation createUsers($input: CreateUsersInput!) {
			createUsers(input: $input) {
				edges {
					node {
						name
						age
					}
				}
			}
		}
	`,
  updateUser: gql`
		mutation updateUser($input: UpdateUserInput!) {
			updateUser(input: $input) {
				user {
					name
					age
				}
			}
		}
	`,
  updateUsers: gql`
		mutation updateUsers($input: UpdateUsersInput!) {
			updateUsers(input: $input) {
				edges {
					node {
						name
						age
					}
				}
			}
		}
	`,
  deleteUser: gql`
		mutation deleteUser($input: DeleteUserInput!) {
			deleteUser(input: $input) {
				user {
					name
					age
				}
			}
		}
	`,
  deleteUsers: gql`
		mutation deleteUsers($input: DeleteUsersInput!) {
			deleteUsers(input: $input) {
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
