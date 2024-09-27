import { describe, beforeAll, afterAll, it, expect } from 'bun:test'
import type { Wabe } from '../../server'
import {
  closeTests,
  getAnonymousClient,
  getGraphqlClient,
  getUserClient,
  setupTests,
  type DevWabeTypes,
} from '../../utils/helper'
import { gql, type GraphQLClient } from 'graphql-request'

describe('me', () => {
  let wabe: Wabe<DevWabeTypes>
  let port: number
  let client: GraphQLClient
  let rootClient: GraphQLClient

  beforeAll(async () => {
    const setup = await setupTests()
    wabe = setup.wabe
    port = setup.port
    client = getAnonymousClient(port)
    rootClient = getGraphqlClient(port)
  })

  afterAll(async () => {
    await closeTests(wabe)
  })

  it('should return information about current user', async () => {
    const res = await client.request<any>(graphql.signUpWith, {
      input: {
        authentication: {
          emailPassword: {
            email: 'email@test.com',
            password: 'password,',
          },
        },
      },
    })

    const userClient = getUserClient(port, res.signUpWith.accessToken)

    const {
      me: { user },
    } = await userClient.request<any>(graphql.me)

    expect(user.authentication.emailPassword.email).toBe('email@test.com')
  })
})

const graphql = {
  signUpWith: gql`
		 mutation signUpWith($input: SignUpWithInput!) {
  		signUpWith(input:	$input){
  			id
  			accessToken
  			refreshToken
  		}
  	}
	 `,
  me: gql`
    query me {
      me {
       user{
           id
           authentication{
               emailPassword{
                   email
               }
           }
       }
      }
    }
  `,
}
