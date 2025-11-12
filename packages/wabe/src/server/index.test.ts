import { describe, expect, it, spyOn } from 'bun:test'
import { v4 as uuid } from 'uuid'
import getPort from 'get-port'
import { Wabe } from '.'
import { Schema } from '../schema'
import { OperationType } from '../hooks'
import { getAnonymousClient, getUserClient } from '../utils/helper'
import { gql } from 'graphql-request'
import { getDatabaseAdapter } from '../utils/testHelper'
import { RoleEnum } from 'generated/wabe'

describe('Server', () => {
	it('should mask graphql errors message', async () => {
		spyOn(console, 'error').mockReturnValue()
		const databaseId = uuid()

		const port = await getPort()
		const wabe = new Wabe({
			isProduction: false,
			rootKey:
				'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
			database: {
				// @ts-expect-error
				adapter: await getDatabaseAdapter(databaseId),
			},
			security: {
				hideSensitiveErrorMessage: true,
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
			rootKey:
				'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
			database: {
				// @ts-expect-error
				adapter: await getDatabaseAdapter(databaseId),
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
			rootKey:
				'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
			database: {
				// @ts-expect-error
				adapter: await getDatabaseAdapter(databaseId),
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
			rootKey:
				'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
			database: {
				// @ts-expect-error
				adapter: await getDatabaseAdapter(databaseId),
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
					rootKey:
						'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
					database: {
						// @ts-expect-error
						adapter: await getDatabaseAdapter(databaseId),
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
					rootKey:
						'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
					database: {
						// @ts-expect-error
						adapter: await getDatabaseAdapter(databaseId),
					},
					port,
					hooks: [],
				}),
		).not.toThrow()

		expect(
			async () =>
				new Wabe({
					isProduction: false,
					rootKey:
						'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
					database: {
						// @ts-expect-error
						adapter: await getDatabaseAdapter(databaseId),
					},
					port,
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
			rootKey:
				'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
			database: {
				// @ts-expect-error
				adapter: await getDatabaseAdapter(databaseId),
			},
			port,
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
			rootKey:
				'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
			database: {
				// @ts-expect-error
				adapter: await getDatabaseAdapter(databaseId),
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

		// _Session class is a default class so if it's present the schema is updated
		const isSessionClassExist = wabe.config.schema?.classes?.find(
			(schemaClass) => schemaClass.name === '_Session',
		)

		expect(isSessionClassExist).not.toBeUndefined()

		expect(spySchemaDefaultClass).toHaveBeenCalledTimes(1)
		expect(spySchemaDefaultEnum).toHaveBeenCalledTimes(1)

		await wabe.close()
	})

	it('should load RoleEnum correctly', async () => {
		const databaseId = uuid()

		const port = await getPort()

		const wabe = new Wabe({
			isProduction: false,
			rootKey:
				'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
			database: {
				// @ts-expect-error
				adapter: await getDatabaseAdapter(databaseId),
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
			authentication: {
				roles: ['Admin', 'Client'],
			},
		})

		await wabe.start()

		const roleEnum = wabe.config.schema?.enums?.find(
			(schemaEnum) => schemaEnum.name === 'RoleEnum',
		)

		expect(roleEnum).not.toBeUndefined()
		expect(roleEnum?.values).toEqual({
			Admin: 'Admin',
			Client: 'Client',
			DashboardAdmin: 'DashboardAdmin',
		})

		await wabe.close()
	})

	it('should be able to setup custom session handler', async () => {
		const databaseId = uuid()

		const port = await getPort()
		const port2 = await getPort()
		const wabeMain = new Wabe({
			isProduction: false,
			rootKey:
				'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
			database: {
				// @ts-expect-error
				adapter: await getDatabaseAdapter(databaseId),
			},
			authentication: {
				roles: ['Client'],
			},
			port,
		})

		await wabeMain.start()

		const wabeSlave1 = new Wabe({
			isProduction: false,
			rootKey:
				'eIUbb9abFa8PJGRfRwgiGSCU0fGnLErph2QYjigDRjLsbyNA3fZJ8Npd0FJNzxAc',
			database: {
				// @ts-expect-error
				adapter: await getDatabaseAdapter(databaseId),
			},
			authentication: {
				sessionHandler: (ctx) => {
					ctx.wabe = {
						wabe: wabeSlave1,
						isRoot: false,
						sessionId: 'sessionId',
						user: {
							id: 'id',
							role: {
								id: 'roleId',
								name: 'Client',
							},
						},
					}
				},
			},
			schema: {
				classes: [
					{
						name: 'Test1',
						fields: {
							name: {
								type: 'String',
							},
						},
						permissions: {
							create: {
								requireAuthentication: true,
								authorizedRoles: [RoleEnum.Client],
							},
						},
					},
				],
			},
			port: port2,
		})

		await wabeSlave1.start()

		const client = getAnonymousClient(port2)

		const {
			signUpWith: { accessToken },
		} = await client.request<any>(graphql.signUpWith, {
			input: {
				authentication: {
					emailPassword: {
						email: 'test@test.com',
						password: 'password',
					},
				},
			},
		})

		const userClient = getUserClient(port2, accessToken)

		await userClient.request<any>(
			gql`
      mutation createTest1($input: CreateTest1Input!) {
        createTest1(input: $input) {
          test1 {
            name
          }
        }
      }
      `,
			{
				input: {
					fields: {
						name: 'test',
					},
				},
			},
		)

		expect(
			userClient.request<any>(gql`
      query test1s {
          test1s {
            edges {
                node {
                    name
                }
            }
          }
      }
      `),
		).rejects.toThrow('Permission denied to read class Test1')

		await wabeSlave1.close()

		await wabeMain.close()
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
}
