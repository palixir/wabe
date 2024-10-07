import { describe, beforeAll, afterAll, it, expect } from 'bun:test'
import { gql, type GraphQLClient } from 'graphql-request'
import {
  closeTests,
  type DevWabeTypes,
  getGraphqlClient,
  getUserClient,
  setupTests,
} from '../../utils/helper'
import type { Wabe } from '../../server'

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

  it('should update the authentication of a user for a specific provider', async () => {
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

    await userClient.request<any>(graphql.updateAuthenticationData, {
      input: {
        userId: id,
        authentication: {
          emailPassword: {
            email: 'email@test.fr',
            password: 'password2',
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
})

const graphql = {
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
  updateAuthenticationData: gql`
		 mutation updateAuthenticationData($input: UpdateAuthenticationDataInput!) {
  		updateAuthenticationData(input: $input)
  	}
	 `,
}
