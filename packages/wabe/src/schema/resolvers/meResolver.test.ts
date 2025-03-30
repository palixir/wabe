import { describe, beforeAll, afterAll, it, expect } from 'bun:test'
import type { Wabe } from '../../server'
import { getAdminUserClient, type DevWabeTypes } from '../../utils/helper'
import { setupTests, closeTests } from '../../utils/testHelper'
import { gql } from 'graphql-request'

describe('me', () => {
  let wabe: Wabe<DevWabeTypes>

  beforeAll(async () => {
    const setup = await setupTests()
    wabe = setup.wabe
  })

  afterAll(async () => {
    await closeTests(wabe)
  })

  it('should return information about current user', async () => {
    const adminClient = await getAdminUserClient(wabe.config.port, wabe, {
      email: 'admin@wabe.dev',
      password: 'admin',
    })

    const {
      me: { user },
    } = await adminClient.request<any>(graphql.me)

    expect(user.role.name).toBe('Admin')

    expect(user.authentication.emailPassword.email).toBe('admin@wabe.dev')
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
           role {
               name
           }
       }
      }
    }
  `,
}
