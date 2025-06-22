import { describe, it, afterAll, beforeAll, expect, beforeEach } from 'bun:test'
import { gql, type GraphQLClient } from 'graphql-request'
import {
  type DevWabeTypes,
  getAnonymousClient,
  getGraphqlClient,
} from '../../utils/helper'
import { setupTests, closeTests } from '../../utils/testHelper'
import type { Wabe } from '../../server'
import { OTP } from 'src'

describe('resetPasswordResolver', () => {
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
    await wabe.controllers.database.clearDatabase()
  })

  it('should let an anonymous reset the password of an user', async () => {
    process.env.NODE_ENV = 'production'

    const anonymousClient = getAnonymousClient(port)

    await anonymousClient.request<any>(graphql.createUser, {
      input: {
        fields: {
          authentication: {
            emailPassword: {
              email: 'toto@toto.fr',
              password: 'totototo',
            },
          },
        },
      },
    })

    const {
      users: { edges },
    } = await getGraphqlClient(port).request<any>(gql`
        query users {
          users (where: {email: {equalTo: "toto@toto.fr"}}) {
            edges {
              node {
                id
              }
            }
          }
        }
    `)

    const userId = edges[0].node.id

    const otp = new OTP(wabe.config.rootKey)

    await anonymousClient.request<any>(graphql.resetPassword, {
      input: {
        email: 'toto@toto.fr',
        password: 'tata',
        otp: otp.generate(userId),
      },
    })

    const res = await anonymousClient.request<any>(graphql.signInWith, {
      input: {
        authentication: {
          emailPassword: {
            email: 'toto@toto.fr',
            password: 'tata',
          },
        },
      },
    })

    expect(res.signInWith.user.id).toEqual(userId)

    process.env.NODE_ENV = 'test'
  })

  it('should reset password of an user if the OTP code is valid', async () => {
    process.env.NODE_ENV = 'production'

    const {
      createUser: { user },
    } = await client.request<any>(graphql.createUserWithRoot, {
      input: {
        fields: {
          authentication: {
            emailPassword: {
              email: 'toto@toto.fr',
              password: 'totototo',
            },
          },
        },
      },
    })

    const userId = user.id

    const otp = new OTP(wabe.config.rootKey)

    await client.request<any>(graphql.resetPassword, {
      input: {
        email: 'toto@toto.fr',
        password: 'tata',
        otp: otp.generate(userId),
      },
    })

    const res = await client.request<any>(graphql.signInWith, {
      input: {
        authentication: {
          emailPassword: {
            email: 'toto@toto.fr',
            password: 'tata',
          },
        },
      },
    })

    expect(res.signInWith.user.id).toEqual(userId)

    process.env.NODE_ENV = 'test'
  })

  it('should reset password in dev mode with valid normal code', async () => {
    process.env.NODE_ENV = 'test'

    const {
      createUser: { user },
    } = await client.request<any>(graphql.createUserWithRoot, {
      input: {
        fields: {
          authentication: {
            emailPassword: {
              email: 'toto@toto.fr',
              password: 'totototo',
            },
          },
        },
      },
    })

    const userId = user.id

    const otp = new OTP(wabe.config.rootKey)

    await client.request<any>(graphql.resetPassword, {
      input: {
        email: 'toto@toto.fr',
        password: 'tata',
        otp: otp.generate(userId),
      },
    })

    const res = await client.request<any>(graphql.signInWith, {
      input: {
        authentication: {
          emailPassword: {
            email: 'toto@toto.fr',
            password: 'tata',
          },
        },
      },
    })

    expect(res.signInWith.user.id).toEqual(userId)
  })

  it('should reset password in dev mode with code 000000', async () => {
    process.env.NODE_ENV = 'test'

    const {
      createUser: { user },
    } = await client.request<any>(graphql.createUserWithRoot, {
      input: {
        fields: {
          authentication: {
            emailPassword: {
              email: 'toto2@toto.fr',
              password: 'totototo',
            },
          },
        },
      },
    })

    const userId = user.id

    await client.request<any>(graphql.resetPassword, {
      input: {
        email: 'toto2@toto.fr',
        password: 'tata',
        otp: '000000',
      },
    })

    const res = await client.request<any>(graphql.signInWith, {
      input: {
        authentication: {
          emailPassword: {
            email: 'toto2@toto.fr',
            password: 'tata',
          },
        },
      },
    })

    expect(res.signInWith.user.id).toEqual(userId)
  })

  it("should return true if the user doesn't exist (hide sensitive data)", async () => {
    process.env.NODE_ENV = 'test'

    const res = await client.request<any>(graphql.resetPassword, {
      input: {
        email: 'invalidUser@toto.fr',
        password: 'tata',
        otp: '000000',
      },
    })

    expect(res.resetPassword).toEqual(true)
  })

  it('should not reset password of an user if the OTP code is invalid', async () => {
    process.env.NODE_ENV = 'production'

    await client.request<any>(graphql.createUserWithRoot, {
      input: {
        fields: {
          authentication: {
            emailPassword: {
              email: 'toto3@toto.fr',
              password: 'totototo',
            },
          },
        },
      },
    })

    expect(
      client.request<any>(graphql.resetPassword, {
        input: {
          email: 'toto3@toto.fr',
          password: 'tata',
          otp: 'invalidOtp',
        },
      }),
    ).rejects.toThrow('Invalid OTP code')

    process.env.NODE_ENV = 'test'
  })

  it('should reset password of another provider than emailPassword', async () => {
    process.env.NODE_ENV = 'production'

    const {
      createUser: { user },
    } = await client.request<any>(graphql.createUserWithRoot, {
      input: {
        fields: {
          authentication: {
            phonePassword: {
              phone: '+33600000000',
              password: 'totototo',
            },
          },
        },
      },
    })

    const userId = user.id

    const otp = new OTP(wabe.config.rootKey)

    await client.request<any>(graphql.resetPassword, {
      input: {
        phone: '+33600000000',
        password: 'tata',
        otp: otp.generate(userId),
      },
    })

    const res = await client.request<any>(graphql.signInWith, {
      input: {
        authentication: {
          phonePassword: {
            phone: '+33600000000',
            password: 'tata',
          },
        },
      },
    })

    expect(res.signInWith.user.id).toEqual(userId)

    process.env.NODE_ENV = 'test'
  })
})

const graphql = {
  signInWith: gql`
      mutation signInWith($input: SignInWithInput!) {
        signInWith(input: $input){
          user {
              id
          }
        }
      }
    `,
  createUser: gql`
      mutation createUser($input: CreateUserInput!) {
        createUser(input: $input) {
          ok
        }
      }
    `,
  createUserWithRoot: gql`
      mutation createUser($input: CreateUserInput!) {
        createUser(input: $input) {
          user {
            id
          }
        }
      }
    `,
  resetPassword: gql`
      mutation resetPassword($input: ResetPasswordInput!) {
        resetPassword(input: $input)
      }
  `,
}
