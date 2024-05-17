import { describe, expect, it } from 'bun:test'
import { v4 as uuid } from 'uuid'
import { WibeApp } from '../server'
import getPort from 'get-port'
import { DatabaseEnum } from '../database'
import { gql } from 'graphql-request'
import { getGraphqlClient } from '../utils/helper'
import { SchemaInterface } from '.'

const createWibeApp = async (schema: SchemaInterface) => {
	const databaseId = uuid()

	const port = await getPort()

	const wibeApp = new WibeApp({
		port,
		schema,
		wibeKey:
			'0uwFvUxM$ceFuF1aEtTtZMa7DUN2NZudqgY5ve5W*QCyb58cwMj9JeoaV@d#%29v&aJzswuudVU1%nAT+rxS0Bh&OkgBYc0PH18*',
		database: {
			type: DatabaseEnum.Mongo,
			url: 'mongodb://127.0.0.1:27045',
			name: databaseId,
		},
	})

	await wibeApp.start()

	const client = getGraphqlClient(port)

	return { client, wibeApp }
}

describe('GraphqlSchema', () => {
	it('should not create input for mutation when there is no field', async () => {
		const { client, wibeApp } = await createWibeApp({
			class: [
				{
					name: 'TestClass',
					fields: { field1: { type: 'String' } },
					resolvers: {
						mutations: {
							customMutation: {
								type: 'Boolean',
								resolve: () => true,
							},
						},
					},
				},
			],
		})

		const request = await client.request<any>(graphql.customMutation, {})

		expect(request.customMutation).toBe(true)

		await wibeApp.close()
	})

	it('should create mutation with empty input', async () => {
		const { client, wibeApp } = await createWibeApp({
			class: [
				{
					name: 'TestClass',
					fields: { field1: { type: 'String' } },
					resolvers: {
						mutations: {
							customMutation: {
								type: 'Boolean',
								resolve: () => true,
								args: {
									input: {},
								},
							},
						},
					},
				},
			],
		})

		const request = await client.request<any>(graphql.customMutation, {})

		expect(request.customMutation).toBe(true)

		await wibeApp.close()
	})

	it('should execute when there is no fields', async () => {
		const { client, wibeApp } = await createWibeApp({
			class: [
				{
					name: 'TestClass',
					fields: { field1: { type: 'String' } },
					resolvers: {
						queries: {
							customQueries: {
								type: 'Boolean',
								resolve: () => true,
							},
						},
					},
				},
			],
		})

		const request = await client.request<any>(graphql.customQueries, {})

		expect(request.customQueries).toBe(true)

		await wibeApp.close()
	})
})

const graphql = {
	customMutation: gql`
		mutation customMutation {
			customMutation
		}
	`,
	customQueries: gql`
		query customQueries {
			customQueries
		}
	`,
}
