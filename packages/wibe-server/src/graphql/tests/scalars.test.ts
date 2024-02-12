import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { WibeApp } from '../../server'
import { GraphQLClient, gql } from 'graphql-request'
import { closeTests, getGraphqlClient, setupTests } from '../../utils/helper'

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
			const { createMany_User } = await client.request<any>(
				graphql.createMany_User,
				{
					input: {
						fields: [
							{
								name: 'Jean',
								birthDate: now,
								email: 'email@test.fr',
							},
						],
					},
				},
			)

			expect(createMany_User.edges[0].node.birthDate).toEqual(
				now.toISOString(),
			)
		})

		it('should create a date with timestamp in number', async () => {
			const { createMany_User } = await client.request<any>(
				graphql.createMany_User,
				{
					input: {
						fields: [
							{
								name: 'Jean2',
								birthDate: now.getTime(),
								email: 'email@test.fr',
							},
						],
					},
				},
			)

			expect(createMany_User.edges[0].node.birthDate).toEqual(
				now.toISOString(),
			)
		})

		it('should create a date with iso string', async () => {
			const { createMany_User } = await client.request<any>(
				graphql.createMany_User,
				{
					input: {
						fields: [
							{
								name: 'Jean3',
								birthDate: now.toISOString(),
								email: 'email@test.fr',
							},
						],
					},
				},
			)

			expect(createMany_User.edges[0].node.birthDate).toEqual(
				now.toISOString(),
			)
		})

		it('should create a date with partial date', async () => {
			const { createMany_User } = await client.request<any>(
				graphql.createMany_User,
				{
					input: {
						fields: [
							{
								name: 'Jean4',
								birthDate: '2023-12-20',
								email: 'email@test.fr',
							},
						],
					},
				},
			)

			const birthDate = new Date(createMany_User.edges[0].node.birthDate)
			const date = new Date('2023-12-20')

			expect(date.getFullYear()).toEqual(birthDate.getFullYear())
			expect(date.getMonth()).toEqual(birthDate.getMonth())
			expect(date.getDate()).toEqual(birthDate.getDate())
		})

		it('should not create a date with invalid string', async () => {
			expect(
				client.request(graphql.createMany_User, {
					input: {
						fields: [
							{
								name: 'Jean5',
								birthDate: now.getTime().toString(),
							},
						],
					},
				}),
			).rejects.toThrow('Invalid date')

			expect(
				client.request(graphql.createMany_User, {
					input: {
						fields: [
							{
								name: 'Jean5',
								birthDate: 'tata',
							},
						],
					},
				}),
			).rejects.toThrow('Invalid date')
		})
	})

	describe('Email', () => {
		it('should create an email', async () => {
			const { createMany_User } = await client.request<any>(
				graphql.createMany_User,
				{
					input: {
						fields: [
							{
								name: 'Jean',
								email: 'jean.doe@gmail.com',
							},
						],
					},
				},
			)

			expect(createMany_User.edges[0].node.email).toEqual(
				'jean.doe@gmail.com',
			)

			expect(
				client.request(graphql.createMany_User, {
					input: {
						fields: [
							{
								name: 'Jean',
								email: 'oe@gmail.com',
							},
						],
					},
				}),
			).resolves.toEqual(expect.anything())

			expect(
				client.request(graphql.createMany_User, {
					input: {
						fields: [
							{
								name: 'Jean',
								email: 'test.@gmail.fr',
							},
						],
					},
				}),
			).resolves.toEqual(expect.anything())
		})

		it('should not create an invalid email', async () => {
			expect(
				client.request(graphql.createMany_User, {
					input: {
						fields: [
							{
								name: 'Jean',
								email: 'jean.doe',
							},
						],
					},
				}),
			).rejects.toThrow('Invalid email')

			expect(
				client.request(graphql.createMany_User, {
					input: {
						fields: [
							{
								name: 'Jean',
								email: 'jean.doe@gmail',
							},
						],
					},
				}),
			).rejects.toThrow('Invalid email')

			expect(
				client.request(graphql.createMany_User, {
					input: {
						fields: [
							{
								name: 'Jean',
								email: '@gmail.com',
							},
						],
					},
				}),
			).rejects.toThrow('Invalid email')

			expect(
				client.request(graphql.createMany_User, {
					input: {
						fields: [
							{
								name: 'Jean',
								email: '@gmail',
							},
						],
					},
				}),
			).rejects.toThrow('Invalid email')
		})
	})
})

const graphql = {
	findMany_User: gql`
        query findMany_User($where: _UserWhereInput) {
            findMany_User(where: $where) {
                edges {
                    node {
                        id
                        name
                        birthDate
                        email
                    }
                }
            }
        }
    `,
	createMany_User: gql`
        mutation createMany_User($input: _UsersCreateInput!) {
            createMany_User(input: $input) {
                edges {
                    node {
                        name
                        birthDate
                        email
                    }
                }
            }
        }
    `,
}
