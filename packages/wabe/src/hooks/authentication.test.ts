import { describe, beforeAll, afterAll, it, expect } from 'bun:test'
import { gql, type GraphQLClient } from 'graphql-request'
import {
  closeTests,
  type DevWabeTypes,
  getAnonymousClient,
  getGraphqlClient,
  getUserClient,
  setupTests,
} from '../utils/helper'
import type { Wabe } from '../server'

describe('updateAuthenticationDataResolver', () => {
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

  it('should create an user with createUser mutation and sign in', async () => {
    const userCreated = await client.request<any>(graphql.createUser, {
      input: {
        fields: {
          authentication: {
            emailPassword: {
              email: 'email0@test.fr',
              password: 'password',
            },
          },
        },
      },
    })

    const anonymousClient = getAnonymousClient(port)

    const res = await anonymousClient.request<any>(graphql.signInWith, {
      input: {
        authentication: {
          emailPassword: {
            email: 'email0@test.fr',
            password: 'password',
          },
        },
      },
    })

    expect(res.signInWith.id).toEqual(userCreated.createUser.user.id)

    expect(
      anonymousClient.request<any>(graphql.signInWith, {
        input: {
          authentication: {
            emailPassword: {
              email: 'email0r@test.fr',
              password: 'password',
            },
          },
        },
      }),
    ).rejects.toThrow('Invalid authentication credentials')
  })

  it('should update the authentication password of an user for a specific provider', async () => {
    const {
      signUpWith: { id, accessToken },
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

    const userClient = getUserClient(port, accessToken)

    await userClient.request<any>(graphql.updateUser, {
      input: {
        id,
        fields: {
          authentication: {
            emailPassword: {
              email: 'email@test.fr',
              password: 'password2',
            },
          },
        },
      },
    })

    const res = await userClient.request<any>(graphql.signInWith, {
      input: {
        authentication: {
          emailPassword: {
            email: 'email@test.fr',
            password: 'password2',
          },
        },
      },
    })

    expect(res.signInWith.id).toEqual(id)

    expect(
      userClient.request<any>(graphql.signInWith, {
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
  })

  it('should update the authentication email of an user for a specific provider', async () => {
    const {
      signUpWith: { id, accessToken },
    } = await client.request<any>(graphql.signUpWith, {
      input: {
        authentication: {
          emailPassword: {
            email: 'email2@test.fr',
            password: 'password',
          },
        },
      },
    })

    const userClient = getUserClient(port, accessToken)

    await userClient.request<any>(graphql.updateUser, {
      input: {
        id,
        fields: {
          authentication: {
            emailPassword: {
              email: 'email2-bis@test.fr',
              password: 'password',
            },
          },
        },
      },
    })

    const res = await userClient.request<any>(graphql.signInWith, {
      input: {
        authentication: {
          emailPassword: {
            email: 'email2-bis@test.fr',
            password: 'password',
          },
        },
      },
    })

    expect(res.signInWith.id).toEqual(id)

    expect(
      userClient.request<any>(graphql.signInWith, {
        input: {
          authentication: {
            emailPassword: {
              email: 'email2@test.fr',
              password: 'password',
            },
          },
        },
      }),
    ).rejects.toThrow('Invalid authentication credentials')
  })

  it('should not update the authentication of an if the user is not the owner of the object', async () => {
    const {
      signUpWith: { id },
    } = await client.request<any>(graphql.signUpWith, {
      input: {
        authentication: {
          emailPassword: {
            email: 'email3@test.fr',
            password: 'password',
          },
        },
      },
    })

    const {
      signUpWith: { accessToken: otherUserAccessToken },
    } = await client.request<any>(graphql.signUpWith, {
      input: {
        authentication: {
          emailPassword: {
            email: 'email3-invalid@test.fr',
            password: 'password',
          },
        },
      },
    })

    const userClient = getUserClient(port, otherUserAccessToken)

    expect(
      userClient.request<any>(graphql.updateUser, {
        input: {
          id,
          fields: {
            authentication: {
              emailPassword: {
                email: 'email3@test.fr',
                password: 'password2',
              },
            },
          },
        },
      }),
    ).rejects.toThrow('Object not found')

    expect(
      getAnonymousClient(port).request<any>(graphql.updateUser, {
        input: {
          id,
          fields: {
            authentication: {
              emailPassword: {
                email: 'email3@test.fr',
                password: 'password2',
              },
            },
          },
        },
      }),
    ).rejects.toThrow('Object not found')

    const res = await userClient.request<any>(graphql.signInWith, {
      input: {
        authentication: {
          emailPassword: {
            email: 'email3@test.fr',
            password: 'password',
          },
        },
      },
    })

    expect(res.signInWith.id).toEqual(id)
  })
})

const graphql = {
  createUser: gql`
      mutation createUser($input: CreateUserInput!) {
        createUser(input: $input) {
          user {
            id
          }
        }
      }
    `,
  signInWith: gql`
		 mutation signInWith($input: SignInWithInput!) {
  		signInWith(input: $input){
  			id
  			accessToken
  			refreshToken
  		}
		}
	`,
  signUpWith: gql`
		 mutation signUpWith($input: SignUpWithInput!) {
  		signUpWith(input:	$input){
  			id
  			accessToken
  			refreshToken
  		}
  	}
	 `,
  updateUser: gql`
		 mutation updateUser($input: UpdateUserInput!) {
  		updateUser(input: $input){
        user {
            id
            acl {
                users {
                    userId
                }
            }
        }
      }
  	}
	 `,
}
