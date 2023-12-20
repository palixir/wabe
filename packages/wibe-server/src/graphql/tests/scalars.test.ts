import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { WibeApp } from '../../server'
import { GraphQLClient, gql } from 'graphql-request'
import {
	closeTests,
	getGraphqlClient,
	setupTests,
} from '../../utils/testHelper'

const graphql = {
	users: gql`
        query users($where: UserWhereInput) {
            users(where: $where) {
                id
                name
                birthDate
            }
        }
    `,
	createUsers: gql`
        mutation createUsers($input: [UserInput]) {
            createUsers(input: $input) {
                name
                birthDate
            }
        }
    `,
}

describe('GraphQL : Scalars', () => {
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

	afterAll(async () => {
		await closeTests(wibe)
	})

	describe('Date', () => {
		it('should create a date with JavaScript Date', async () => {
			await client.request<any>(graphql.createUsers, {
				input: [
					{
						name: 'Jean',
						birthDate: now,
					},
				],
			})

			const { users } = await client.request<any>(graphql.users, {
				where: {
					name: {
						equalTo: 'Jean',
					},
				},
			})

			expect(users[0].birthDate).toEqual(now.getTime())
		})

		it('should create a date with timestamp in number', async () => {
			await client.request<any>(graphql.createUsers, {
				input: [
					{
						name: 'Jean2',
						birthDate: now.getTime(),
					},
				],
			})

			const { users } = await client.request<any>(graphql.users, {
				where: {
					name: {
						equalTo: 'Jean2',
					},
				},
			})

			expect(users[0].birthDate).toEqual(now.getTime())
		})

		it('should create a date with iso string', async () => {
			await client.request<any>(graphql.createUsers, {
				input: [
					{
						name: 'Jean3',
						birthDate: now.toISOString(),
					},
				],
			})

			const { users } = await client.request<any>(graphql.users, {
				where: {
					name: {
						equalTo: 'Jean3',
					},
				},
			})

			expect(users[0].birthDate).toEqual(now.getTime())
		})

		it('should create a date with partial date', async () => {
			await client.request<any>(graphql.createUsers, {
				input: [
					{
						name: 'Jean3',
						birthDate: '2023-12-20',
					},
				],
			})

			const { users } = await client.request<any>(graphql.users, {
				where: {
					name: {
						equalTo: 'Jean3',
					},
				},
			})

			const birthDate = new Date(users[0].birthDate)
			const date = new Date('2023-12-20')

			expect(date.getFullYear()).toEqual(birthDate.getFullYear())
			expect(date.getMonth()).toEqual(birthDate.getMonth())
			expect(date.getDate()).toEqual(birthDate.getDate())
		})

		it('should not create a date with invalid string', async () => {
			expect(
				client.request<any>(graphql.createUsers, {
					input: [
						{
							name: 'Jean3',
							birthDate: now.getTime().toString(),
						},
					],
				}),
			).rejects.toThrow('Invalid date')

			expect(
				client.request<any>(graphql.createUsers, {
					input: [
						{
							name: 'Jean3',
							birthDate: 'tata',
						},
					],
				}),
			).rejects.toThrow('Invalid date')
		})
	})
})
