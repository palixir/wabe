import { describe, it, afterAll, beforeAll, expect } from 'bun:test'
import { createHash } from 'node:crypto'
import { totp } from 'otplib'
import { gql, type GraphQLClient } from 'graphql-request'
import {
  closeTests,
  type DevWabeTypes,
  getGraphqlClient,
  setupTests,
} from '../../utils/helper'
import type { Wabe } from '../../server'

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

  it('should reset password of an user if the OTP code is valid', async () => {
    process.env.NODE_ENV = 'production'

    const {
      createUser: { user },
    } = await client.request<any>(graphql.createUser, {
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

    const secret = wabe.config.internalConfig.otpSecret

    const hashedSecret = createHash('sha256')
      .update(`${secret}:${userId}`)
      .digest('hex')

    const otp = totp.generate(hashedSecret)

    await client.request<any>(graphql.resetPassword, {
      input: {
        email: 'toto@toto.fr',
        password: 'tata',
        otp,
        provider: 'emailPassword',
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

    expect(res.signInWith.id).toEqual(userId)

    process.env.NODE_ENV = 'test'
  })

  it('should reset password in dev mode with code 000000', async () => {
    process.env.NODE_ENV = 'test'

    const {
      createUser: { user },
    } = await client.request<any>(graphql.createUser, {
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
        provider: 'emailPassword',
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

    expect(res.signInWith.id).toEqual(userId)
  })

  it("should not reset password if the user doesn't exist", async () => {
    process.env.NODE_ENV = 'test'

    expect(
      client.request<any>(graphql.resetPassword, {
        input: {
          email: 'invalidUser@toto.fr',
          password: 'tata',
          otp: '000000',
          provider: 'emailPassword',
        },
      }),
    ).rejects.toThrow('User not found')
  })

  it('should not reset password of an user if the OTP code is invalid', async () => {
    process.env.NODE_ENV = 'production'

    await client.request<any>(graphql.createUser, {
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
          provider: 'emailPassword',
        },
      }),
    ).rejects.toThrow('Invalid OTP code')

    process.env.NODE_ENV = 'test'
  })
})

const graphql = {
  signInWith: gql`
      mutation signInWith($input: SignInWithInput!) {
        signInWith(input: $input){
          id
        }
      }
    `,
  createUser: gql`
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
