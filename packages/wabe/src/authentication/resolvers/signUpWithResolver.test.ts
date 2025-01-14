import { beforeAll, afterAll, describe, expect, it } from 'bun:test'
import {
  closeTests,
  type DevWabeTypes,
  getAnonymousClient,
  setupTests,
} from '../../utils/helper'
import type { Wabe } from '../../server'
import { gql } from 'graphql-request'

describe('SignUpWith', () => {
  let wabe: Wabe<DevWabeTypes>

  beforeAll(async () => {
    const setup = await setupTests()
    wabe = setup.wabe
  })

  afterAll(async () => {
    await closeTests(wabe)
  })

  it('should block the signUpWith if the user creation is blocked for anonymous (the creation is done with root to avoid ACL issues)', () => {
    const anonymousClient = getAnonymousClient(wabe.config.port)

    const userSchema = wabe.config.schema?.classes?.find(
      (classItem) => classItem.name === 'User',
    )

    if (!userSchema) throw new Error('Failed to find user schema')

    // @ts-expect-error
    userSchema.permissions.create.requireAuthentication = true

    expect(
      anonymousClient.request<any>(
        gql`
      mutation signUpWith($input: SignUpWithInput!) {
        signUpWith(input: $input) {
          id
        }
      }
      `,
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
      ),
    ).rejects.toThrow('Permission denied to create class User')

    // @ts-expect-error
    userSchema.permissions.create.requireAuthentication = false
  })

  it('should signUpWith email and password when the user not exist', async () => {
    const anonymousClient = getAnonymousClient(wabe.config.port)

    const res = await anonymousClient.request<any>(
      gql`
      mutation signUpWith($input: SignUpWithInput!) {
          signUpWith(input: $input) {
              id
          }
      }
    `,
      {
        input: {
          authentication: {
            emailPassword: {
              email: 'test@gmail.com',
              password: 'password',
            },
          },
        },
      },
    )

    expect(res.signUpWith.id).toEqual(expect.any(String))
  })
})
