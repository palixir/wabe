import { describe, beforeAll, afterAll, expect, it, beforeEach } from 'bun:test'
import { gql } from 'graphql-request'
import type { Wabe } from '../server'
import {
  type DevWabeTypes,
  getAnonymousClient,
  getUserClient,
} from '../utils/helper'
import { setupTests, closeTests } from '../utils/testHelper'

describe('hooks/session', () => {
  let wabe: Wabe<DevWabeTypes>
  let port: number

  beforeAll(async () => {
    const setup = await setupTests()
    wabe = setup.wabe
    port = setup.port
  })

  beforeEach(async () => {
    await wabe.controllers.database.clearDatabase()
  })

  afterAll(async () => {
    await closeTests(wabe)
  })

  it('should link a new session to user relation after creation', async () => {
    const anonymousClient = getAnonymousClient(port)

    await anonymousClient.request<any>(graphql.signUpWith, {
      input: {
        authentication: {
          emailPassword: {
            email: 'email@test.fr',
            password: 'password',
          },
        },
      },
    })

    const res = await wabe.controllers.database.getObjects({
      className: 'User',
      context: {
        wabe,
        isRoot: true,
      },
      select: {
        id: true,
        sessions: true,
      },
    })

    expect(res[0]?.sessions?.length).toEqual(1)
  })

  it('should unlink a session from user relation after deletion', async () => {
    const anonymousClient = getAnonymousClient(port)

    const res = await anonymousClient.request<any>(graphql.signUpWith, {
      input: {
        authentication: {
          emailPassword: {
            email: 'email2@test.fr',
            password: 'password',
          },
        },
      },
    })

    const userClient = getUserClient(port, res.signUpWith.accessToken)

    await userClient.request<any>(graphql.signInWith, {
      input: {
        authentication: {
          emailPassword: {
            email: 'email2@test.fr',
            password: 'password',
          },
        },
      },
    })

    const res2 = await wabe.controllers.database.getObjects({
      className: 'User',
      context: {
        wabe,
        isRoot: true,
      },
      select: {
        id: true,
        sessions: true,
      },
    })

    await wabe.controllers.database.deleteObjects({
      className: '_Session',
      where: {
        id: { equalTo: res2[0]?.sessions?.[0]?.id },
      },
      context: {
        wabe,
        isRoot: true,
      },
      select: {},
    })

    const res3 = await wabe.controllers.database.getObjects({
      className: 'User',
      context: {
        wabe,
        isRoot: true,
      },
    })

    expect(res3[0]?.sessions?.length).toEqual(1)
  })
})

const graphql = {
  signUpWith: gql`
    mutation signUpWith($input: SignUpWithInput!) {
        signUpWith(input: $input){
            accessToken
        }
    }
    `,
  signInWith: gql`
    mutation signInWith($input: SignInWithInput!) {
        signInWith(input: $input){
            accessToken
        }
    }
    `,
}
