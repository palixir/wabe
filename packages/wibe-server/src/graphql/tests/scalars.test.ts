import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { WibeApp } from '../../server'
import { GraphQLClient, gql } from 'graphql-request'
import {
	closeTests,
	getGraphqlClient,
	setupTests,
} from '../../utils/testHelper'

const graphql = {
	findManyUser: gql`
        query findManyUser($where: UserWhereInput) {
            findManyUser(where: $where) {
				objects {
					id
					name
					birthDate
					email
				}
            }
        }
    `,
	createManyUser: gql`
        mutation createManyUser($input: UsersCreateInput!) {
            createManyUser(input: $input) {
				objects {
					name
					birthDate
					email
				}
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
			const { createManyUser } = await client.request<any>(
				graphql.createManyUser,
				{
					input: {
						fields: [
							{
								name: 'Jean',
								birthDate: now,
							},
						],
					},
				},
			)

			expect(createManyUser.objects[0].birthDate).toEqual(
				now.toISOString(),
			)
		})

		it('should create a date with timestamp in number', async () => {
			const { createManyUser } = await client.request<any>(
				graphql.createManyUser,
				{
					input: {
						fields: [
							{
								name: 'Jean2',
								birthDate: now.getTime(),
							},
						],
					},
				},
			)

			expect(createManyUser.objects[0].birthDate).toEqual(
				now.toISOString(),
			)
		})

		it('should create a date with iso string', async () => {
			const { createManyUser } = await client.request<any>(
				graphql.createManyUser,
				{
					input: {
						fields: [
							{
								name: 'Jean3',
								birthDate: now.toISOString(),
							},
						],
					},
				},
			)

			expect(createManyUser.objects[0].birthDate).toEqual(
				now.toISOString(),
			)
		})

		it('should create a date with partial date', async () => {
			const { createManyUser } = await client.request<any>(
				graphql.createManyUser,
				{
					input: {
						fields: [
							{
								name: 'Jean4',
								birthDate: '2023-12-20',
							},
						],
					},
				},
			)

			const birthDate = new Date(createManyUser.objects[0].birthDate)
			const date = new Date('2023-12-20')

			expect(date.getFullYear()).toEqual(birthDate.getFullYear())
			expect(date.getMonth()).toEqual(birthDate.getMonth())
			expect(date.getDate()).toEqual(birthDate.getDate())
		})

		it('should not create a date with invalid string', async () => {
			expect(
				client.request<any>(graphql.createManyUser, {
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
				client.request<any>(graphql.createManyUser, {
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
			const { createManyUser } = await client.request<any>(
				graphql.createManyUser,
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

			expect(createManyUser.objects[0].email).toEqual(
				'jean.doe@gmail.com',
			)

			expect(
				client.request<any>(graphql.createManyUser, {
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
				client.request<any>(graphql.createManyUser, {
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
				client.request<any>(graphql.createManyUser, {
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
				client.request<any>(graphql.createManyUser, {
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
				client.request<any>(graphql.createManyUser, {
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
				client.request<any>(graphql.createManyUser, {
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
