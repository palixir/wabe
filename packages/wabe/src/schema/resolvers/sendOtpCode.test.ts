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
  getAnonymousClient,
} from '../../utils/helper'
import { EmailDevAdapter } from '../../email/DevAdapter'

describe('sendOtpCodeResolver', () => {
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

  it('should use the provided email template if provided', async () => {
    const previous = wabe.config.email
    // @ts-expect-error
    wabe.config.email = {
      ...wabe.config.email,
      htmlTemplates: {
        sendOTPCode: () => 'toto',
      },
    }

    await client.request<any>(graphql.createUser, {
      input: {
        fields: {
          authentication: {
            emailPassword: {
              email: 'tata@toto.fr',
              password: 'totototo',
            },
          },
        },
      },
    })

    await client.request<any>(graphql.sendOtpCode, {
      input: {
        email: 'tata@toto.fr',
      },
    })

    expect(spySend).toHaveBeenCalledTimes(1)
    expect(spySend).toHaveBeenCalledWith({
      from: 'main.email@wabe.com',
      to: ['tata@toto.fr'],
      subject: 'Confirmation code',
      html: 'toto',
    })

    wabe.config.email = previous
  })

  it("should send an OTP code to the user's email as anonymous client", async () => {
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

    await anonymousClient.request<any>(graphql.sendOtpCode, {
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
