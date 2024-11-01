import { describe, beforeAll, afterAll, expect, it } from 'bun:test'
import type { Wabe } from '../server'
import {
  closeTests,
  type DevWabeTypes,
  getGraphqlClient,
  setupTests,
} from '../utils/helper'
import { gql, type GraphQLClient } from 'graphql-request'

describe('Delete session on delete user', () => {
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

  it('should delete the session when the user is deleted', async () => {
    const {
      signUpWith: { id: userId },
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

    const { _sessions: sessions1 } = await client.request<any>(graphql.sessions)

    expect(sessions1.edges.length).toEqual(1)

    await client.request<any>(graphql.deleteUser, {
      input: {
        id: userId,
      },
    })

    const { _sessions: sessions2 } = await client.request<any>(graphql.sessions)

    expect(sessions2.edges.length).toEqual(0)
  })
})

const graphql = {
  sessions: gql`
		query _sessions {
			_sessions {
				edges {
					node {
						id
					}
				}
			}
		}
	`,
  signUpWith: gql`
    mutation signUpWith($input: SignUpWithInput!) {
        signUpWith(input: $input){
            id
            accessToken
            refreshToken
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
}
