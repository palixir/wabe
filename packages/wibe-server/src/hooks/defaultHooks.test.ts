import { describe, expect, it, beforeAll, afterAll } from 'bun:test'
import { GraphQLClient, gql } from 'graphql-request'
import { closeTests, getGraphqlClient, setupTests } from '../utils/helper'
import { WibeApp } from '..'

describe('Default hooks', () => {
	let wibe: WibeApp
	let port: number
	let client: GraphQLClient

	const now = new Date()

	beforeAll(async () => {
		const setup = await setupTests()
		wibe = setup.wibe
		port = setup.port
		client = getGraphqlClient(port)
	})

	afterAll(() => {
		closeTests(wibe)
	})

	describe('CreatedAt and UpdatedAt', () => {
		it('should add createdAt value', async () => {
			const { create_User } = await client.request<any>(
				graphql.create_User,
				{
					input: {
						fields: {
							email: 'email@test.fr',
						},
					},
				},
			)

			const createdAt = new Date(create_User.createdAt)

			// Don't test hours to avoid flaky
			expect(createdAt.getDay()).toEqual(now.getDay())
			expect(createdAt.getMonth()).toEqual(now.getMonth())
			expect(createdAt.getFullYear()).toEqual(now.getFullYear())

			expect(create_User.updatedAt).toBeNull()
		})

		it('shoud add updatedAt value', async () => {
			const { create_User } = await client.request<any>(
				graphql.create_User,
				{
					input: {
						fields: {
							email: 'email@test.fr',
						},
					},
				},
			)

			const { update_User } = await client.request<any>(
				graphql.update_User,
				{
					input: {
						id: create_User.id,
						fields: {
							email: 'email2@test.fr',
						},
					},
				},
			)

			const updatedAt = new Date(update_User.updatedAt)

			// Don't test hours to avoid flaky
			expect(updatedAt.getDay()).toEqual(now.getDay())
			expect(updatedAt.getMonth()).toEqual(now.getMonth())
			expect(updatedAt.getFullYear()).toEqual(now.getFullYear())
		})
	})

	describe('Default value', () => {
		it('should add the value if a default value is defined in schema but not specified', async () => {
			const { create_User } = await client.request<any>(
				graphql.create_User,
				{
					input: {
						fields: {
							email: 'email@test.fr',
						},
					},
				},
			)

			expect(create_User.isAdmin).toBe(false)
		})

		it('should not add a default value if a value is specified', async () => {
			const { create_User } = await client.request<any>(
				graphql.create_User,
				{
					input: {
						fields: {
							isAdmin: true,
							email: 'email@test.fr',
						},
					},
				},
			)

			expect(create_User.isAdmin).toBe(true)
		})
	})
})

const graphql = {
	create_User: gql`
        mutation createUser($input: _UserCreateInput!) {
            create_User(input: $input) {
                id
                isAdmin
                createdAt
                updatedAt
            }
        }
    `,
	update_User: gql`
        mutation updateUser($input: _UserUpdateInput!) {
            update_User(input: $input) {
                id
                createdAt
                updatedAt
            }
        }
    `,
}
