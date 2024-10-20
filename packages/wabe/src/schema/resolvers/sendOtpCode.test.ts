import {
  describe,
  afterAll,
  beforeAll,
  it,
  spyOn,
  expect,
  beforeEach,
} from 'bun:test'
import { gql, type GraphQLClient } from 'graphql-request'
import type { Wabe } from '../../server'
import {
  type DevWabeTypes,
  setupTests,
  getGraphqlClient,
  closeTests,
} from '../../utils/helper'
import { EmailDevAdapter } from '../../email/DevAdapter'

describe('sendtpcodeResolver', () => {
  let wabe: Wabe<DevWabeTypes>
  let port: number
  let client: GraphQLClient

  const spySend = spyOn(EmailDevAdapter.prototype, 'send')

  beforeAll(async () => {
    const setup = await setupTests()
    wabe = setup.wabe
    port = setup.port
    client = getGraphqlClient(port)
  })

  afterAll(async () => {
    await closeTests(wabe)
  })

  beforeEach(() => {
    spySend.mockClear()
  })

  it("should send an OTP code to the user's email", async () => {
    await client.request<any>(graphql.createUser, {
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

    await client.request<any>(graphql.sendOtpCode, {
      input: {
        email: 'toto@toto.fr',
      },
    })

    expect(spySend).toHaveBeenCalledTimes(1)
    expect(spySend).toHaveBeenCalledWith({
      from: 'main.email@wabe.com',
      to: ['toto@toto.fr'],
      subject: 'Confirmation code',
      html: expect.any(String),
    })
  })

  it("should throw an error if the user doesn't exist", async () => {
    const spySend = spyOn(EmailDevAdapter.prototype, 'send')

    expect(
      client.request<any>(graphql.sendOtpCode, {
        input: {
          email: 'invalidUser@toto.fr',
        },
      }),
    ).rejects.toThrow('User not found')

    expect(spySend).toHaveBeenCalledTimes(0)
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
  sendOtpCode: gql`
      mutation sendOtpCode($input: SendOtpCodeInput!) {
        sendOtpCode(input: $input)
      }
  `,
}