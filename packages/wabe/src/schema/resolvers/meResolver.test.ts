import { describe, beforeAll, afterAll, it, expect } from 'bun:test'
import type { Wabe } from '../../server'
import { getAdminUserClient, getAnonymousClient, type DevWabeTypes } from '../../utils/helper'
import { setupTests, closeTests } from '../../utils/testHelper'
import { gql } from 'graphql-request'

describe('me', () => {
	let wabe: Wabe<DevWabeTypes>
	let port: number

	beforeAll(async () => {
		const setup = await setupTests()
		wabe = setup.wabe
		port = setup.port
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

	it('should return null user when request is anonymous', async () => {
		const anonymousClient = getAnonymousClient(port)
		const {
			me: { user },
		} = await anonymousClient.request<any>(graphql.me)

		expect(user).toBeNull()
	})
})

const graphql = {
	signUpWith: gql`
		mutation signUpWith($input: SignUpWithInput!) {
			signUpWith(input: $input) {
				id
				accessToken
				refreshToken
			}
		}
	`,
	me: gql`
		query me {
			me {
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
}
