import { describe, it, beforeAll, afterAll, expect } from 'bun:test'
import { gql } from 'graphql-request'
import type { Wabe } from 'src'
import { getAdminUserClient, type DevWabeTypes } from 'src/utils/helper'
import { setupTests, closeTests } from 'src/utils/testHelper'

describe('signInWithResolver integration test', () => {
  let wabe: Wabe<DevWabeTypes>

  beforeAll(async () => {
    const setup = await setupTests()
    wabe = setup.wabe
  })

  afterAll(async () => {
    await closeTests(wabe)
  })

  it('should return all fields of the user on signInWith resolver', async () => {
    const adminClient = await getAdminUserClient(wabe.config.port, wabe, {
      email: 'admin@wabe.dev',
      password: 'admin',
    })
    const res = await adminClient.request<any>(
      gql`
      mutation signInWith($input: SignInWithInput!) {
        signInWith(input: $input) {
          user {
            id
            authentication {
              emailPassword {
                email
              }
            }
            role {
                name
            }
          }
        }
      }
    `,
      {
        input: {
          authentication: {
            emailPassword: {
              email: 'admin@wabe.dev',
              password: 'admin',
            },
          },
        },
      },
    )

    expect(res.signInWith.user.role.name).toBe('Admin')
    expect(res.signInWith.user.authentication.emailPassword).toEqual({
      email: 'admin@wabe.dev',
    })
  })
})
