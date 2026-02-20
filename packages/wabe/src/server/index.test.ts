import { describe, expect, it, spyOn } from 'bun:test'
import { v4 as uuid } from 'uuid'
import getPort from 'get-port'
import { Wabe } from '.'
import { Schema } from '../schema'
import { OperationType } from '../hooks'
import { getAnonymousClient } from '../utils/helper'
import { gql } from 'graphql-request'
import { getDatabaseAdapter } from '../utils/testHelper'
import * as WobeYoga from 'wobe-graphql-yoga'

describe('Server', () => {
	it('should throw error if no jwt secret provided but cookie session choosen', async () => {
		const databaseId = uuid()

		const port = await getPort()
		const wabe = new Wabe({
			isProduction: false,
			rootKey: 'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
			database: {
				// @ts-expect-error
				adapter: await getDatabaseAdapter(databaseId),
			},
			port,
			authentication: {
				// @ts-expect-error
				session: {
					cookieSession: true,
				},
			},
			routes: [
				{
					handler: (ctx) => ctx.res.send('Hello World!'),
					path: '/hello',
					method: 'GET',
				},
			],
			schema: {
				classes: [
					{
						name: 'Collection1',
						fields: { name: { type: 'String' } },
					},
				],
			},
		})

		expect(wabe.start()).rejects.toThrow('Authentication session requires jwt secret')
	})

	it('should throw error if no jwt secret provided but csrf protection is enabled', async () => {
		const databaseId = uuid()

		const port = await getPort()
		const wabe = new Wabe({
			isProduction: false,
			rootKey: 'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
			database: {
				// @ts-expect-error
				adapter: await getDatabaseAdapter(databaseId),
			},
			port,
			authentication: {
				// @ts-expect-error
				session: {},
			},
			security: {
				disableCSRFProtection: false,
			},
			routes: [
				{
					handler: (ctx) => ctx.res.send('Hello World!'),
					path: '/hello',
					method: 'GET',
				},
			],
			schema: {
				classes: [
					{
						name: 'Collection1',
						fields: { name: { type: 'String' } },
					},
				],
			},
		})

		expect(wabe.start()).rejects.toThrow('Authentication session requires jwt secret')
	})

	it('should return GraphiQL for GET /graphql in development', async () => {
		const databaseId = uuid()
		const port = await getPort()
		const wabe = new Wabe({
			isProduction: false,
			rootKey: 'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
			database: {
				// @ts-expect-error
				adapter: await getDatabaseAdapter(databaseId),
			},
			port,
			security: {
				disableCSRFProtection: true,
			},
			schema: {
				classes: [
					{
						name: 'Collection1',
						fields: { name: { type: 'String' } },
					},
				],
			},
		})

		await wabe.start()

		const res = await fetch(`http://127.0.0.1:${port}/graphql`, {
			method: 'GET',
			headers: { Accept: 'text/html' },
		})

		const text = await res.text()
		expect(res.status).toBe(200)
		expect(text).toContain('GraphiQL')

		await wabe.close()
	})

	it('should return GraphiQL in production by default', async () => {
		const databaseId = uuid()
		const port = await getPort()
		const wabe = new Wabe({
			isProduction: true,
			rootKey: 'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
			database: {
				// @ts-expect-error
				adapter: await getDatabaseAdapter(databaseId),
			},
			port,
			security: {
				disableCSRFProtection: true,
			},
			schema: {
				classes: [
					{
						name: 'Collection1',
						fields: { name: { type: 'String' } },
					},
				],
			},
		})

		await wabe.start()

		const res = await fetch(`http://127.0.0.1:${port}/graphql`, {
			method: 'GET',
			headers: { Accept: 'text/html' },
		})

		const text = await res.text()
		expect(res.status).toBe(200)
		expect(text).toContain('GraphiQL')

		await wabe.close()
	})

	it('should not return GraphiQL when disableGraphQLDashboard is true', async () => {
		const databaseId = uuid()
		const port = await getPort()
		const wabe = new Wabe({
			isProduction: false,
			rootKey: 'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
			database: {
				// @ts-expect-error
				adapter: await getDatabaseAdapter(databaseId),
			},
			port,
			security: {
				disableCSRFProtection: true,
				disableGraphQLDashboard: true,
			},
			schema: {
				classes: [
					{
						name: 'Collection1',
						fields: { name: { type: 'String' } },
					},
				],
			},
		})

		await wabe.start()

		const res = await fetch(`http://127.0.0.1:${port}/graphql`, {
			method: 'GET',
			headers: { Accept: 'text/html' },
		})

		const text = await res.text()
		expect(text).not.toContain('GraphiQL')

		await wabe.close()
	})

	it('should pass graphql options to yoga plugin', async () => {
		const databaseId = uuid()

		const receivedOptions: any[] = []
		const originalPlugin = WobeYoga.WobeGraphqlYogaPlugin
		const pluginSpy = spyOn(WobeYoga, 'WobeGraphqlYogaPlugin').mockImplementation(
			(options: any) => {
				receivedOptions.push(options)
				return originalPlugin(options)
			},
		)

		const port = await getPort()
		const wabe = new Wabe({
			isProduction: true,
			rootKey: 'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
			database: {
				// @ts-expect-error
				adapter: await getDatabaseAdapter(databaseId),
			},
			port,
			authentication: {
				session: {
					jwtSecret: 'secret',
				},
			},
			security: {
				disableCSRFProtection: true,
				maxGraphqlDepth: 60,
			},
			schema: {
				classes: [
					{
						name: 'Collection1',
						fields: { name: { type: 'String' } },
					},
				],
			},
		})

		try {
			await wabe.start()
		} finally {
			await wabe.close()
			pluginSpy.mockRestore()
		}

		expect(receivedOptions.length).toBeGreaterThan(0)
		const args = receivedOptions[0]
		expect(args?.allowIntrospection).toBe(true)
		expect(args?.maxDepth).toBe(60)
		expect(args?.allowMultipleOperations).toBe(true)
	})

	it('should mask graphql errors message', async () => {
		spyOn(console, 'error').mockReturnValue()
		const databaseId = uuid()

		const port = await getPort()
		const wabe = new Wabe({
			isProduction: false,
			rootKey: 'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
			database: {
				// @ts-expect-error
				adapter: await getDatabaseAdapter(databaseId),
			},
			security: {
				hideSensitiveErrorMessage: true,
				disableCSRFProtection: true,
			},
			port,
			schema: {
				resolvers: {
					queries: {
						tata: {
							type: 'Boolean',
							resolve: () => {
								throw new Error('Error message')
							},
						},
					},
				},
			},
		})

		await wabe.start()

		const graphqlClient = getAnonymousClient(port)

		expect(
			graphqlClient.request<any>(gql`
				query tata {
					tata
				}
			`),
		).rejects.toThrow('Unexpected error')

		await wabe.close()
	})

	it('should load routes', async () => {
		const databaseId = uuid()

		const port = await getPort()
		const wabe = new Wabe({
			isProduction: false,
			rootKey: 'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
			database: {
				// @ts-expect-error
				adapter: await getDatabaseAdapter(databaseId),
			},
			security: {
				disableCSRFProtection: true,
			},
			port,
			routes: [
				{
					handler: (ctx) => ctx.res.send('Hello World!'),
					path: '/hello',
					method: 'GET',
				},
			],
			schema: {
				classes: [
					{
						name: 'Collection1',
						fields: { name: { type: 'String' } },
					},
				],
			},
		})

		await wabe.start()

		const res = await fetch(`http://127.0.0.1:${port}/hello`)

		expect(await res.text()).toBe('Hello World!')
		await wabe.close()
	})

	it('should disable /bucket route in production by default', async () => {
		const databaseId = uuid()
		const port = await getPort()
		const wabe = new Wabe({
			isProduction: true,
			rootKey: 'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
			database: {
				// @ts-expect-error
				adapter: await getDatabaseAdapter(databaseId),
			},
			port,
			security: {
				disableCSRFProtection: true,
			},
			schema: {
				classes: [
					{
						name: 'Collection1',
						fields: { name: { type: 'String' } },
					},
				],
			},
		})

		await wabe.start()

		const res = await fetch(`http://127.0.0.1:${port}/bucket/test.txt`)
		expect(res.status).toBe(404)

		await wabe.close()
	})

	it('should setup the root key in context if the root key is correct', async () => {
		const databaseId = uuid()

		const port = await getPort()
		const wabe = new Wabe({
			isProduction: false,
			rootKey: 'thisistherootkey',
			database: {
				// @ts-expect-error
				adapter: await getDatabaseAdapter(databaseId),
			},
			security: {
				disableCSRFProtection: true,
			},
			port,
			schema: {
				classes: [
					{
						name: 'Collection1',
						fields: { name: { type: 'String' } },
					},
				],
			},
		})

		await wabe.start()

		const res = await fetch(`http://127.0.0.1:${port}/graphql`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				query: `
          query {
            collection1s {
              edges {
                node {
                  name
                }
              }
            }
          }
        `,
			}),
		})

		expect((await res.json()).errors[0].message).toEqual(
			'Permission denied to read class Collection1',
		)

		expect(res.status).toEqual(200)
		await wabe.close()
	})

	it('should run server', async () => {
		const databaseId = uuid()

		const port = await getPort()
		const wabe = new Wabe({
			isProduction: false,
			rootKey: 'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
			database: {
				// @ts-expect-error
				adapter: await getDatabaseAdapter(databaseId),
			},
			security: {
				disableCSRFProtection: true,
			},
			port,
			schema: {
				classes: [
					{
						name: 'Collection1',
						fields: { name: { type: 'String' } },
					},
				],
			},
		})

		await wabe.start()

		const res = await fetch(`http://127.0.0.1:${port}/health`)

		expect(res.status).toEqual(200)
		await wabe.close()
	})

	it('should run server on different hostname', async () => {
		const databaseId = uuid()

		const port = await getPort()
		const wabe = new Wabe({
			isProduction: false,
			hostname: '0.0.0.0',
			rootKey: 'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
			database: {
				// @ts-expect-error
				adapter: await getDatabaseAdapter(databaseId),
			},
			port,
			security: {
				disableCSRFProtection: true,
			},
			schema: {
				classes: [
					{
						name: 'Collection1',
						fields: { name: { type: 'String' } },
					},
				],
			},
		})

		await wabe.start()

		const res = await fetch(`http://0.0.0.0:${port}/health`)

		expect(res.status).toEqual(200)
		await wabe.close()
	})

	it('should throw an error if hook has negative value', async () => {
		const databaseId = uuid()

		const port = await getPort()
		expect(
			async () =>
				new Wabe({
					isProduction: false,
					rootKey: 'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
					database: {
						// @ts-expect-error
						adapter: await getDatabaseAdapter(databaseId),
					},
					security: {
						disableCSRFProtection: true,
					},
					port,
					hooks: [
						{
							operationType: OperationType.BeforeCreate,
							callback: () => {},
							priority: -1,
						},
					],
				}),
		).toThrow('Hook priority <= 0 is reserved for internal uses')

		expect(
			async () =>
				new Wabe({
					isProduction: false,
					rootKey: 'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
					database: {
						// @ts-expect-error
						adapter: await getDatabaseAdapter(databaseId),
					},
					security: {
						disableCSRFProtection: true,
					},
					port,
					hooks: [],
				}),
		).not.toThrow()

		expect(
			async () =>
				new Wabe({
					isProduction: false,
					rootKey: 'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
					database: {
						// @ts-expect-error
						adapter: await getDatabaseAdapter(databaseId),
					},
					port,
					security: {
						disableCSRFProtection: true,
					},
					hooks: [
						{
							operationType: OperationType.BeforeCreate,
							callback: () => {},
							priority: 1,
						},
					],
				}),
		).not.toThrow()
	})

	it('should run server without schema object', async () => {
		const databaseId = uuid()

		const port = await getPort()
		const wabe = new Wabe({
			isProduction: false,
			rootKey: 'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
			database: {
				// @ts-expect-error
				adapter: await getDatabaseAdapter(databaseId),
			},
			port,
			security: {
				disableCSRFProtection: true,
			},
		})

		await wabe.start()

		const res = await fetch(`http://127.0.0.1:${port}/health`)

		expect(res.status).toEqual(200)
		await wabe.close()
	})

	it('should update the schema to static Wabe after the Schema initialization', async () => {
		const spySchemaDefaultClass = spyOn(Schema.prototype, 'defaultClass')
		const spySchemaDefaultEnum = spyOn(Schema.prototype, 'defaultEnum')

		const databaseId = uuid()

		const port = await getPort()

		const wabe = new Wabe({
			isProduction: false,
			rootKey: 'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
			database: {
				// @ts-expect-error
				adapter: await getDatabaseAdapter(databaseId),
			},
			port,
			security: {
				disableCSRFProtection: true,
			},
			schema: {
				classes: [
					{
						name: 'Collection1',
						fields: { name: { type: 'String' } },
					},
				],
			},
		})

		await wabe.start()

		// _Session class is a default class so if it's present the schema is updated
		const isSessionClassExist = wabe.config.schema?.classes?.find(
			(schemaClass) => schemaClass.name === '_Session',
		)

		expect(isSessionClassExist).not.toBeUndefined()

		expect(spySchemaDefaultClass).toHaveBeenCalledTimes(1)
		expect(spySchemaDefaultEnum).toHaveBeenCalledTimes(1)

		await wabe.close()
	})

	it('should allow introspection in development by default', async () => {
		const databaseId = uuid()
		const port = await getPort()
		const wabe = new Wabe({
			isProduction: false,
			rootKey: 'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
			database: {
				// @ts-expect-error
				adapter: await getDatabaseAdapter(databaseId),
			},
			port,
			security: {
				disableCSRFProtection: true,
			},
			schema: {
				classes: [
					{
						name: 'Collection1',
						fields: { name: { type: 'String' } },
					},
				],
			},
		})

		await wabe.start()

		const res = await fetch(`http://127.0.0.1:${port}/graphql`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: '{ __schema { types { name } } }',
			}),
		})

		const json = (await res.json()) as { data?: { __schema?: { types?: { name: string }[] } } }
		expect(json.data?.__schema?.types).toBeDefined()
		expect(json.data?.__schema?.types?.length).toBeGreaterThan(0)

		await wabe.close()
	})

	it('should block introspection when disableIntrospection is true', async () => {
		const databaseId = uuid()
		const port = await getPort()
		const wabe = new Wabe({
			isProduction: false,
			rootKey: 'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
			database: {
				// @ts-expect-error
				adapter: await getDatabaseAdapter(databaseId),
			},
			port,
			security: {
				disableCSRFProtection: true,
				disableIntrospection: true,
			},
			schema: {
				classes: [
					{
						name: 'Collection1',
						fields: { name: { type: 'String' } },
					},
				],
			},
		})

		await wabe.start()

		const res = await fetch(`http://127.0.0.1:${port}/graphql`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: '{ __schema { types { name } } }',
			}),
		})

		const json = (await res.json()) as { errors?: { message: string }[] }
		expect(json.errors).toBeDefined()
		expect(json.errors?.[0]?.message).toContain('introspection')

		await wabe.close()
	})

	it('should block introspection in production when disableIntrospection is true', async () => {
		const databaseId = uuid()
		const port = await getPort()
		const wabe = new Wabe({
			isProduction: true,
			rootKey: 'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
			database: {
				// @ts-expect-error
				adapter: await getDatabaseAdapter(databaseId),
			},
			port,
			security: {
				disableCSRFProtection: true,
				disableIntrospection: true,
			},
			schema: {
				classes: [
					{
						name: 'Collection1',
						fields: { name: { type: 'String' } },
					},
				],
			},
		})

		await wabe.start()

		const res = await fetch(`http://127.0.0.1:${port}/graphql`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: '{ __schema { types { name } } }',
			}),
		})

		const json = (await res.json()) as { errors?: { message: string }[] }
		expect(json.errors).toBeDefined()
		expect(json.errors?.[0]?.message).toContain('introspection')

		await wabe.close()
	})

	it('should allow introspection in production by default', async () => {
		const databaseId = uuid()
		const port = await getPort()
		const wabe = new Wabe({
			isProduction: true,
			rootKey: 'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
			database: {
				// @ts-expect-error
				adapter: await getDatabaseAdapter(databaseId),
			},
			port,
			security: {
				disableCSRFProtection: true,
			},
			schema: {
				classes: [
					{
						name: 'Collection1',
						fields: { name: { type: 'String' } },
					},
				],
			},
		})

		await wabe.start()

		const res = await fetch(`http://127.0.0.1:${port}/graphql`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query: '{ __schema { types { name } } }',
			}),
		})

		const json = (await res.json()) as { data?: { __schema?: { types?: { name: string }[] } } }
		expect(json.data?.__schema?.types).toBeDefined()
		expect(json.data?.__schema?.types?.length).toBeGreaterThan(0)

		await wabe.close()
	})

	it('should load RoleEnum correctly', async () => {
		const databaseId = uuid()

		const port = await getPort()

		const wabe = new Wabe({
			isProduction: false,
			rootKey: 'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
			database: {
				// @ts-expect-error
				adapter: await getDatabaseAdapter(databaseId),
			},
			port,
			security: {
				disableCSRFProtection: true,
			},
			schema: {
				classes: [
					{
						name: 'Collection1',
						fields: { name: { type: 'String' } },
					},
				],
			},
			authentication: {
				roles: ['Admin', 'Client'],
			},
		})

		await wabe.start()

		const roleEnum = wabe.config.schema?.enums?.find((schemaEnum) => schemaEnum.name === 'RoleEnum')

		expect(roleEnum).not.toBeUndefined()
		expect(roleEnum?.values).toEqual({
			Admin: 'Admin',
			Client: 'Client',
			DashboardAdmin: 'DashboardAdmin',
		})

		await wabe.close()
	})
})
