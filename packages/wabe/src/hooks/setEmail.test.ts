import { describe, beforeAll, afterAll, expect, it, afterEach } from 'bun:test'
import {
  closeTests,
  getGraphqlClient,
  setupTests,
  type DevWabeTypes,
} from '../utils/helper'
import type { Wabe } from '../server'
import { gql, type GraphQLClient } from 'graphql-request'

describe('setEmail', () => {
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

  afterEach(async () => {
    await client.request<any>(graphql.deleteUsers)
  })

  it("should set email if it doesn't exist", async () => {
    const {
      signUpWith: { id },
    } = await client.request<any>(graphql.signUpWith, {
      input: {
        authentication: {
          emailPassword: {
            email: 'email@test.fr',
            password: 'password',
          },
        },
      },
    })

    const { user } = await client.request<any>(graphql.user, {
      id,
    })

    expect(user.email).toEqual('email@test.fr')
    expect(user.provider).toEqual('emailPassword')
  })

  it('should not set email if it is provided during the creation', async () => {
    const {
      createUser: { user },
    } = await client.request<any>(graphql.createUser, {
      input: {
        fields: {
          name: 'John',
          age: 23,
          email: 'email@test.fr',
        },
      },
    })

    expect(user.email).toEqual('email@test.fr')
    expect(user.provider).toEqual(null)
  })

  it('should update email if it change during update', async () => {
    const {
      createUser: { user },
    } = await client.request<any>(graphql.createUser, {
      input: {
        fields: {
          name: 'John',
          age: 23,
          email: 'email@test.fr',
        },
      },
    })

    const userId = user.id

    const {
      updateUser: { user: updatedUser },
    } = await client.request<any>(graphql.updateUser, {
      input: {
        id: userId,
        fields: {
          authentication: {
            emailPassword: {
              email: 'updated@test.fr',
            },
          },
        },
      },
    })

    expect(updatedUser.email).toEqual('updated@test.fr')
    expect(updatedUser.provider).toEqual('emailPassword')
  })

  it('should not update email if email is provided', async () => {
    const {
      createUser: { user },
    } = await client.request<any>(graphql.createUser, {
      input: {
        fields: {
          name: 'John',
          age: 23,
          email: 'email@test.fr',
        },
      },
    })

    const userId = user.id

    const {
      updateUser: { user: updatedUser },
    } = await client.request<any>(graphql.updateUser, {
      input: {
        id: userId,
        fields: {
          authentication: {
            emailPassword: {
              email: 'updated@test.fr',
            },
          },
          email: 'updated2@test.fr',
        },
      },
    })

    expect(updatedUser.email).toEqual('updated2@test.fr')
    expect(updatedUser.provider).toEqual(null)
  })

  it('should not update email if email is provided but not authentication field', async () => {
    const {
      createUser: { user },
    } = await client.request<any>(graphql.createUser, {
      input: {
        fields: {
          name: 'John',
          age: 23,
          email: 'email@test.fr',
        },
      },
    })

    const userId = user.id

    const {
      updateUser: { user: updatedUser },
    } = await client.request<any>(graphql.updateUser, {
      input: {
        id: userId,
        fields: {
          email: 'updated2@test.fr',
        },
      },
    })

    expect(updatedUser.email).toEqual('updated2@test.fr')
    expect(updatedUser.provider).toEqual(null)
  })
})

const graphql = {
  signUpWith: gql`
    mutation signUpWith($input: SignUpWithInput!) {
      signUpWith(input: $input) {
        id
      }
    }
  `,
  user: gql`
    query user($id: ID!) {
      user(id: $id) {
        id
        email
        provider
      }
    }
  `,
  createUser: gql`
		mutation createUser($input: CreateUserInput!) {
			createUser(input: $input) {
				user {
					id
					email
					provider
				}
			}
		}
	`,
  updateUser: gql`
		mutation updateUser($input: UpdateUserInput!) {
			updateUser(input: $input) {
				user {
					id
					email
					provider
				}
			}
		}
	`,
  deleteUsers: gql`
		mutation deleteUsers {
			deleteUsers(input: {}){
				edges {
					node {
						id
					}
				}
			}
		}
	`,
}
