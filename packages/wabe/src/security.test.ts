import { describe, it, expect, afterEach } from 'bun:test'
import { decode, sign } from 'jsonwebtoken'
import { gql, type GraphQLClient } from 'graphql-request'
import type { Wabe } from './server'
import {
	type DevWabeTypes,
	getAdminUserClient,
	getGraphqlClient,
	getAnonymousClient,
	createUserAndUpdateRole,
	getUserClient,
} from './utils/helper'
import { setupTests, closeTests } from './utils/testHelper'
import { RoleEnum } from 'generated/wabe'

describe('Security tests', () => {
	let wabe: Wabe<DevWabeTypes> | undefined
	let port: number
	let client: GraphQLClient
	let rootClient: GraphQLClient

	afterEach(async () => {
		if (!wabe) return

		await closeTests(wabe)
		wabe = undefined
	})

	it('should not return private fields (acl) on createObject, getObject and getObjects if not root', async () => {
		const setup = await setupTests([
			{
				name: 'Secret',
				fields: {
					name: { type: 'String' },
				},
				permissions: {
					create: {
						requireAuthentication: true,
						authorizedRoles: ['Client'],
					},
					read: {
						requireAuthentication: true,
						authorizedRoles: ['Client'],
					},
					acl: async (hookObject) => {
						await hookObject.addACL('roles', {
							read: true,
							write: true,
							role: RoleEnum.Client,
						})
					},
				},
			},
		])

		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		const { userClient } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client',
			rootClient,
		})

		const res = await userClient.request<any>(gql`
				mutation createSecret {
					createSecret(
						input: { fields: { name: "n", } }
					) {
						secret {
							id
							acl {
			            roles {
                    roleId
                    read
                    write
                  }
							}
						}
					}
				}
			`)

		expect(res.createSecret.secret.acl).toBeNull()

		const res2 = await userClient.request<any>(gql`
          query secret {
            secret(id: "${res.createSecret.secret.id}") {
              id
              acl {
                roles {
                    roleId
                    read
                    write
                }
              }
            }
          }
        `)

		expect(res2.secret.acl).toBeNull()

		const res3 = await userClient.request<any>(gql`
            query secrets {
              secrets{
                edges {
                    node {
                        id
                        acl {
                          roles {
                              roleId
                              read
                              write
                          }
                        }
                    }
                }
              }
            }
          `)

		expect(res3.secrets.edges[0].node.acl).toBeNull()

		const res4 = await rootClient.request<any>(gql`
            query secret {
              secret(id: "${res.createSecret.secret.id}") {
                id
                name
                acl {
                  roles {
                    roleId
                    read
                    write
                  }
                }
              }
            }
          `)

		expect(res4.secret.acl.roles).not.toBeNull()

		await closeTests(wabe)
	})

	it('should block requests without a valid CSRF token', async () => {
		const setup = await setupTests(
			[
				{
					name: 'TestCSRF',
					fields: {
						name: { type: 'String' },
					},
					permissions: {
						create: {
							authorizedRoles: ['Client'],
							requireAuthentication: true,
						},
						read: {
							authorizedRoles: ['Client'],
							requireAuthentication: true,
						},
					},
				},
			],
			{ disableCSRFProtection: false },
		)

		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		const { userClient, accessToken, csrfToken } =
			await createUserAndUpdateRole({
				anonymousClient: client,
				port,
				roleName: 'Client',
				rootClient,
			})

		expect(
			userClient.request(gql`
				mutation createTestCSRF {
					createTestCSRF(input: { fields: { name: "CSRF Test" } }) {
						testCSRF {
							id
						}
					}
				}
			`),
		).rejects.toThrow('Permission denied to create class TestCSRF')

		const invalidCsrfClient = getUserClient(port, {
			accessToken,
			csrfToken: 'invalid-csrf-token',
		})
		expect(
			invalidCsrfClient.request(gql`
				mutation createTestCSRF {
					createTestCSRF(input: { fields: { name: "CSRF Test" } }) {
						testCSRF {
							id
						}
					}
				}
			`),
		).rejects.toThrow('Permission denied to create class TestCSRF')

		const validCsrfClient = getUserClient(port, {
			accessToken,
			csrfToken,
		})

		const res = await validCsrfClient.request<any>(gql`
			mutation createTestCSRF {
				createTestCSRF(input: { fields: { name: "CSRF Test" } }) {
					testCSRF {
						id
					}
				}
			}
		`)

		expect(res.createTestCSRF.testCSRF.id).toBeDefined()

		await closeTests(wabe)
	})

	it('should not block requests without a valid CSRF token if security.csrfToken is to false', async () => {
		const setup = await setupTests([
			{
				name: 'TestCSRF',
				fields: {
					name: { type: 'String' },
				},
				permissions: {
					create: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
					read: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
				},
			},
		])

		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		const { accessToken } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client',
			rootClient,
		})

		const invalidCsrfClient = getUserClient(port, {
			accessToken,
			csrfToken: 'invalid-csrf-token',
		})

		const res = await invalidCsrfClient.request<any>(gql`
			mutation createTestCSRF {
				createTestCSRF(input: { fields: { name: "CSRF Test" } }) {
					testCSRF {
						id
					}
				}
			}
		`)

		expect(res.createTestCSRF.testCSRF.id).toBeDefined()

		await closeTests(wabe)
	})

	it('should not return protected fields in creation response when user is not authorized to read them', async () => {
		const setup = await setupTests([
			{
				name: 'Secret',
				fields: {
					name: { type: 'String' },
					secret: {
						type: 'String',
						protected: {
							protectedOperations: ['read'],
							authorizedRoles: ['Admin'],
						},
					},
				},
				permissions: {
					create: {
						requireAuthentication: true,
						authorizedRoles: ['Client'],
					},
					read: {
						requireAuthentication: true,
						authorizedRoles: ['Client'],
					},
				},
			},
		])

		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		const { userClient } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client',
			rootClient,
		})

		expect(
			userClient.request<any>(gql`
				mutation createSecret {
					createSecret(
						input: { fields: { name: "n", secret: "s" } }
					) {
						secret {
							id
							secret
						}
					}
				}
			`),
		).rejects.toThrow('You are not authorized to read this field')

		await closeTests(wabe)
	})

	it('should apply ACL filtering to count queries', async () => {
		const setup = await setupTests([
			{
				name: 'CountAcl',
				fields: {
					name: { type: 'String' },
				},
				permissions: {
					create: {
						requireAuthentication: true,
						authorizedRoles: ['Client'],
					},
					read: {
						requireAuthentication: true,
						authorizedRoles: ['Client'],
					},
					acl: async (hookObject) => {
						await hookObject.addACL('users', null)
						await hookObject.addACL('roles', null)
					},
				},
			},
		])

		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		const { userClient } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client',
			rootClient,
		})

		await rootClient.request<any>(gql`
			mutation createCountAcl {
				createCountAcl(input: { fields: { name: "toto" } }) {
					countAcl {
						id
					}
				}
			}
		`)

		const res = await userClient.request<any>(gql`
			query countAcls {
				countAcls {
					totalCount
				}
			}
		`)

		expect(res.countAcls.totalCount).toEqual(0)

		await closeTests(wabe)
	})

	it('should block GraphQL introspection queries for anonymous and authenticated users for isProduction server', async () => {
		const setup = await setupTests([], { isProduction: true })
		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		// Test pour un utilisateur anonyme
		expect(
			client.request(gql`
				query IntrospectionQuery {
					__schema {
						types {
							name
						}
					}
				}
			`),
		).rejects.toThrow('GraphQL introspection is not allowed in production')

		// Test pour un utilisateur authentifié (même un admin)
		const { userClient } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Admin',
			rootClient,
		})

		expect(
			userClient.request(gql`
				query IntrospectionQuery {
					__schema {
						types {
							name
						}
					}
				}
			`),
		).rejects.toThrow('GraphQL introspection is not allowed in production')

		await closeTests(wabe)
	})

	it('should return null if the accessToken is an invalid accessToken', async () => {
		const setup = await setupTests()
		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		const { accessToken } = await createUserAndUpdateRole({
			anonymousClient: getAnonymousClient(port),
			port,
			roleName: 'Client',
			rootClient,
		})

		const decoded = decode(accessToken) as any

		const invalidToken = sign(
			{
				...decoded,
				sub: 'fake-user-id',
			},
			'dev',
		)

		const userClient = getUserClient(port, { accessToken: invalidToken })

		const res = await userClient.request<any>(gql`
			query me {
				me {
					user {
						id
					}
				}
			}
		`)

		expect(res.me.user).toBeNull()

		await closeTests(wabe)
	})

	it('should throw an error if try to access to a class with empty authorizedRoles but not requireAuthentication', async () => {
		const setup = await setupTests([
			{
				name: 'Test',
				fields: {
					name: {
						type: 'String',
					},
				},
				permissions: {
					read: {
						authorizedRoles: [],
					},
				},
			},
		])
		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		expect(
			client.request(gql`
				query tests {
					tests {
						totalCount
					}
				}
			`),
		).rejects.toThrow('Permission denied to read class Test')

		await closeTests(wabe)
	})

	it('should throw an error if try to count the number of objects in anonymous', async () => {
		const setup = await setupTests([
			{
				name: 'Test',
				fields: {
					name: {
						type: 'String',
					},
				},
				permissions: {
					read: {
						authorizedRoles: [],
						requireAuthentication: true,
					},
				},
			},
		])
		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		expect(
			client.request(gql`
				query tests {
					tests {
						totalCount
					}
				}
			`),
		).rejects.toThrow('Permission denied to read class Test')

		await closeTests(wabe)
	})

	it('should throw an error when I try to update and create ACL field without root access', async () => {
		const setup = await setupTests([
			{
				name: 'Test',
				fields: {
					name: {
						type: 'String',
					},
				},
				permissions: {
					create: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
					read: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
					update: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
				},
			},
		])
		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		const { userClient } = await createUserAndUpdateRole({
			anonymousClient: getAnonymousClient(port),
			port,
			roleName: 'Client',
			rootClient,
		})

		const res = await userClient.request<any>(gql`
			mutation createTest {
				createTest(input: { fields: { name: "Test" } }) {
					test {
						id
					}
				}
			}
		`)

		const testId = res.createTest.test.id

		expect(
			userClient.request(gql`
        mutation updateTest {
            updateTest(input: {id: "${testId}", fields: {acl: {users: [{userId: "2"}]}}}) {
                test {
                    id
                }
            }
        }
        `),
		).rejects.toThrow('You are not authorized to update this field')

		expect(
			userClient.request(gql`
				mutation createTest {
					createTest(
						input: { fields: { acl: { users: [{ userId: "2" }] } } }
					) {
						test {
							id
						}
					}
				}
			`),
		).rejects.toThrow('You are not authorized to create this field')

		await closeTests(wabe)
	})

	it('should throw an error when I try to create an user with a role without root access', async () => {
		const setup = await setupTests()
		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		const adminRole = await wabe.controllers.database.getObjects({
			className: 'Role',
			where: {
				name: { equalTo: 'Admin' },
			},
			first: 1,
			select: { id: true },
			context: {
				wabe,
				isRoot: true,
			},
		})

		expect(
			client.request(gql`
     mutation createUser {
         createUser(input: { fields: {role: {link: "${adminRole[0]?.id}"}} }) {
             user {
                 id
             }
         }
     }
     `),
		).rejects.toThrow('You are not authorized to create this field')

		await closeTests(wabe)
	})

	it('should not be able to update role pointer in the User class', async () => {
		const setup = await setupTests()
		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		const { userId } = await createUserAndUpdateRole({
			anonymousClient: getAnonymousClient(port),
			port,
			roleName: 'Client',
			rootClient,
		})

		expect(
			wabe.controllers.database.updateObject({
				className: 'User',
				id: userId,
				context: {
					wabe,
					isRoot: false,
				},
				data: {
					role: 'newid',
				},
			}),
		).rejects.toThrow('You are not authorized to update this field')

		await closeTests(wabe)
	})

	it('should not be able to create / update sessions relation in the User class', async () => {
		const setup = await setupTests()
		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		const { userId } = await createUserAndUpdateRole({
			anonymousClient: getAnonymousClient(port),
			port,
			roleName: 'Client',
			rootClient,
		})

		expect(
			wabe.controllers.database.updateObject({
				className: 'User',
				id: userId,
				context: {
					wabe,
					isRoot: false,
				},
				data: {
					sessions: ['newid'],
				},
			}),
		).rejects.toThrow('You are not authorized to update this field')

		expect(
			wabe.controllers.database.createObject({
				className: 'User',
				context: {
					wabe,
					isRoot: false,
				},
				data: {
					sessions: ['newid'],
				},
			}),
		).rejects.toThrow('You are not authorized to create this field')

		await closeTests(wabe)
	})

	it("should throw an error if the user tries to delete an object and doesn't have access to read the object", async () => {
		const setup = await setupTests([
			{
				name: 'Test1',
				fields: {
					name: {
						type: 'String',
					},
				},
				permissions: {
					read: {
						authorizedRoles: [],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
					delete: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
				},
			},
		])
		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		const { userClient } = await createUserAndUpdateRole({
			anonymousClient: getAnonymousClient(port),
			port,
			roleName: 'Client',
			rootClient,
		})

		const res = await rootClient.request<any>(gql`
			mutation createTest1 {
				createTest1(input: { fields: { name: "test1" } }) {
					test1 {
						id
					}
				}
			}
		`)

		expect(
			userClient.request(gql`
        mutation deleteTest1{
            deleteTest1(input: {id: "${res.createTest1.test1.id}"}) {
                test1 {
                    id
                }
            }
        }
      `),
		).rejects.toThrow('Permission denied to read class Test1')

		expect(
			userClient.request(gql`
				mutation deleteTest1s {
					deleteTest1s(
						input: { where: { name: { equalTo: "test1" } } }
					) {
						edges {
							node {
								id
							}
						}
					}
				}
			`),
		).rejects.toThrow('Permission denied to read class Test1')

		await closeTests(wabe)
	})

	it("should throw an error if the user try to update an object and doesn't have access to read the object", async () => {
		const setup = await setupTests([
			{
				name: 'Test1',
				fields: {
					name: {
						type: 'String',
					},
				},
				permissions: {
					read: {
						authorizedRoles: [],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
					update: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
				},
			},
		])
		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		const { userClient } = await createUserAndUpdateRole({
			anonymousClient: getAnonymousClient(port),
			port,
			roleName: 'Client',
			rootClient,
		})

		const res = await rootClient.request<any>(gql`
			mutation createTest1 {
				createTest1(input: { fields: { name: "test1" } }) {
					test1 {
						id
					}
				}
			}
		`)

		expect(
			userClient.request(gql`
        mutation updateTest1{
            updateTest1(input: {id: "${res.createTest1.test1.id}", fields: {name: "test1"}}) {
                test1 {
                    id
                }
            }
        }
        `),
		).rejects.toThrow('Permission denied to read class Test1')

		expect(
			userClient.request(gql`
				mutation updateTest1s {
					updateTest1s(
						input: {
							where: { name: { equalTo: "test1" } }
							fields: { name: "test1" }
						}
					) {
						edges {
							node {
								id
							}
						}
					}
				}
			`),
		).rejects.toThrow('Permission denied to read class Test1')

		await closeTests(wabe)
	})

	it('should not create object in relation if not have permission to create', async () => {
		const setup = await setupTests([
			{
				name: 'Test1',
				fields: {
					name: {
						type: 'String',
					},
				},
				permissions: {
					read: {
						authorizedRoles: ['Admin'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: ['Admin'],
						requireAuthentication: true,
					},
				},
			},
			{
				name: 'Test2',
				fields: {
					field1: {
						type: 'Relation',
						class: 'Test1',
					},
					field2: {
						type: 'Pointer',
						class: 'Test1',
					},
				},
				permissions: {
					read: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
				},
			},
		])
		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		const { userClient } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client',
			rootClient,
		})

		expect(
			userClient.request<any>(gql`
				mutation createTest2 {
					createTest2(
						input: {
							fields: {
								field1: { createAndAdd: [{ name: "toto" }] }
							}
						}
					) {
						test2 {
							id
						}
					}
				}
			`),
		).rejects.toThrow('Permission denied to create class Test1')

		await closeTests(wabe)
	})

	it('should not create object in pointer if not have permission to create', async () => {
		const setup = await setupTests([
			{
				name: 'Test1',
				fields: {
					name: {
						type: 'String',
					},
				},
				permissions: {
					read: {
						authorizedRoles: ['Admin'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: ['Admin'],
						requireAuthentication: true,
					},
				},
			},
			{
				name: 'Test2',
				fields: {
					field1: {
						type: 'Relation',
						class: 'Test1',
					},
					field2: {
						type: 'Pointer',
						class: 'Test1',
					},
				},
				permissions: {
					read: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
				},
			},
		])
		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		const { userClient } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client',
			rootClient,
		})

		expect(
			userClient.request<any>(gql`
				mutation createTest2 {
					createTest2(
						input: {
							fields: {
								field2: { createAndLink: { name: "toto" } }
							}
						}
					) {
						test2 {
							id
						}
					}
				}
			`),
		).rejects.toThrow('Permission denied to create class Test1')

		await closeTests(wabe)
	})

	it("should not be able to access to a relation if user doesn't have access on read", async () => {
		const setup = await setupTests([
			{
				name: 'Test1',
				fields: {
					name: {
						type: 'String',
					},
				},
				permissions: {
					read: {
						authorizedRoles: ['Admin'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: ['Admin'],
						requireAuthentication: true,
					},
				},
			},
			{
				name: 'Test2',
				fields: {
					field1: {
						type: 'Relation',
						class: 'Test1',
					},
					field2: {
						type: 'Pointer',
						class: 'Test1',
					},
				},
				permissions: {
					read: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
				},
			},
		])
		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		await rootClient.request<any>(gql`
			mutation createTest2 {
				createTest2(
					input: {
						fields: { field1: { createAndAdd: [{ name: "toto" }] } }
					}
				) {
					test2 {
						id
					}
				}
			}
		`)

		const { userClient } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client',
			rootClient,
		})

		expect(
			userClient.request(gql`
				query test2s {
					test2s {
						edges {
							node {
								id
								field1 {
									edges {
										node {
											id
										}
									}
								}
							}
						}
					}
				}
			`),
		).rejects.toThrow('Permission denied to read class Test1')

		await closeTests(wabe)
	})

	it("should not be able to access to a pointer if user doesn't have access on read", async () => {
		const setup = await setupTests([
			{
				name: 'Test1',
				fields: {
					name: {
						type: 'String',
					},
				},
				permissions: {
					read: {
						authorizedRoles: ['Admin'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: ['Admin'],
						requireAuthentication: true,
					},
				},
			},
			{
				name: 'Test2',
				fields: {
					field1: {
						type: 'Relation',
						class: 'Test1',
					},
					field2: {
						type: 'Pointer',
						class: 'Test1',
					},
				},
				permissions: {
					read: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
				},
			},
		])
		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		await rootClient.request<any>(gql`
			mutation createTest2 {
				createTest2(
					input: {
						fields: { field2: { createAndLink: { name: "toto" } } }
					}
				) {
					test2 {
						id
					}
				}
			}
		`)

		const { userClient } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client',
			rootClient,
		})

		expect(
			userClient.request(gql`
				query test2s {
					test2s {
						edges {
							node {
								id
								field2 {
									id
								}
							}
						}
					}
				}
			`),
		).rejects.toThrow('Permission denied to read class Test1')

		await closeTests(wabe)
	})

	it('should not be able to create / update / delete a role (except root)', async () => {
		const setup = await setupTests()
		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		const adminRole = await wabe.controllers.database.getObjects({
			className: 'Role',
			where: {
				name: { equalTo: 'Admin' },
			},
			first: 1,
			select: { id: true },
			context: {
				wabe,
				isRoot: true,
			},
		})

		const adminRoleId = adminRole[0]?.id

		const adminClient = await getAdminUserClient(wabe.config.port, wabe, {
			email: 'admin@wabe.dev',
			password: 'admin',
		})

		expect(
			adminClient.request<any>(gql`
      mutation deleteRole {
        deleteRole(input: { id: "${adminRoleId}" }) {
            role {
             id
            }
        }
      }
    `),
		).rejects.toThrowError('Permission denied to delete class Role')

		expect(
			adminClient.request<any>(gql`
      mutation updateRole {
        updateRole(input: { id: "${adminRoleId}", fields: {name: "Admin2"} }) {
            role {
             id
            }
        }
      }
    `),
		).rejects.toThrowError('Permission denied to update class Role')

		expect(
			adminClient.request<any>(gql`
				mutation createRole {
					createRole(input: { fields: { name: "Admin2" } }) {
						role {
							id
						}
					}
				}
			`),
		).rejects.toThrowError('Permission denied to create class Role')

		await closeTests(wabe)
	})

	it('should not be able to create / update / delete a session (except root)', async () => {
		const setup = await setupTests()
		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		const adminClient = await getAdminUserClient(wabe.config.port, wabe, {
			email: 'admin@wabe.dev',
			password: 'admin',
		})

		expect(
			adminClient.request<any>(gql`
				mutation create_Session {
					create_Session(
						input: {
							fields: {
								accessTokenEncrypted: "token"
								accessTokenExpiresAt: "2025-01-01T00:00:00.000Z"
								refreshTokenEncrypted: "refresh"
								refreshTokenExpiresAt: "2025-01-02T00:00:00.000Z"
							}
						}
					) {
						_session {
							id
						}
					}
				}
			`),
		).rejects.toThrowError('Permission denied to create class _Session')

		const res = await adminClient.request<any>(gql`
			query me {
				me {
					user {
						id
					}
				}
			}
		`)

		const session = await wabe.controllers.database.createObject({
			className: '_Session',
			context: {
				wabe,
				isRoot: true,
			},
			data: {
				accessTokenEncrypted: 'token',
				user: res.me.user.id,
				accessTokenExpiresAt: new Date(),
				refreshTokenEncrypted: 'refreshToken',
				refreshTokenExpiresAt: new Date(),
			},
			select: { id: true },
		})

		const sessionId = session?.id

		if (!sessionId) throw new Error('Session not created')

		expect(
			adminClient.request<any>(gql`
      mutation update_Session {
        update_Session(input: { id: "${sessionId}", fields: {accessTokenEncrypted: "token2"} }) {
            _session {
             id
            }
        }
      }
    `),
		).rejects.toThrowError('Permission denied to update class _Session')

		expect(
			adminClient.request<any>(gql`
      mutation delete_Session {
        delete_Session(input: { id:"${sessionId}" }) {
            _session {
                id
            }
        }
      }
    `),
			// Read because we call getObject before delete the object
		).rejects.toThrowError('Permission denied to read class _Session')

		const sessionAfterDelete = await wabe.controllers.database.getObject({
			className: '_Session',
			id: sessionId || '',
			context: {
				wabe,
				isRoot: true,
			},
			select: { id: true },
		})

		expect(sessionAfterDelete?.id).toEqual(sessionId)

		await closeTests(wabe)
	})

	it('should not be able to do some actions with expired session', async () => {
		const setup = await setupTests([
			{
				name: 'Test1',
				fields: {
					name: {
						type: 'String',
					},
				},
				permissions: {
					read: {
						authorizedRoles: ['Admin'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: ['Admin'],
						requireAuthentication: true,
					},
				},
			},
		])
		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		const adminClient = await getAdminUserClient(wabe.config.port, wabe, {
			email: 'admin@wabe.dev',
			password: 'admin',
		})

		expect(
			adminClient.request(gql`
				mutation createTest1 {
					createTest1(input: { fields: { name: "test1" } }) {
						test1 {
							id
						}
					}
				}
			`),
		).resolves.toEqual(expect.anything())

		await wabe.controllers.database.updateObjects({
			className: '_Session',
			context: {
				wabe,
				isRoot: true,
			},
			select: { id: true, accessTokenExpiresAt: true },
			data: {
				accessTokenExpiresAt: new Date(Date.now() - 1000 * 3600), // 1 hour ago
				refreshTokenExpiresAt: new Date(Date.now() - 1000 * 3600), // 1 hour ago
			},
			where: {},
		})

		expect(
			adminClient.request(gql`
				mutation createTest1 {
					createTest1(input: { fields: { name: "test1" } }) {
						test1 {
							id
						}
					}
				}
			`),
		).rejects.toThrow('Permission denied to create class Test1')

		await closeTests(wabe)
	})

	it('should be able to refresh session if refresh token is not expired but access token expired', async () => {
		const setup = await setupTests([
			{
				name: 'Test1',
				fields: {
					name: {
						type: 'String',
					},
				},
				permissions: {
					read: {
						authorizedRoles: ['Admin'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: ['Admin'],
						requireAuthentication: true,
					},
				},
			},
		])
		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		const adminClient = await getAdminUserClient(wabe.config.port, wabe, {
			email: 'admin@wabe.dev',
			password: 'admin',
		})

		expect(
			adminClient.request(gql`
				mutation createTest1 {
					createTest1(input: { fields: { name: "test1" } }) {
						test1 {
							id
						}
					}
				}
			`),
		).resolves.toEqual(expect.anything())

		await wabe.controllers.database.updateObjects({
			className: '_Session',
			context: {
				wabe,
				isRoot: true,
			},
			data: {
				accessTokenExpiresAt: new Date(Date.now() - 1000 * 3600), // 1 hour ago
				refreshTokenExpiresAt: new Date(Date.now() + 1000 * 3600), // 1 hour in future
			},
			where: {},
		})

		expect(
			adminClient.request(gql`
				mutation createTest1 {
					createTest1(input: { fields: { name: "test1" } }) {
						test1 {
							id
						}
					}
				}
			`),
		).resolves.toEqual(expect.anything())

		await closeTests(wabe)
	})

	it('should access to an object', async () => {
		const setup = await setupTests([
			{
				name: 'Test4',
				fields: {
					name: { type: 'String' },
				},
				permissions: {
					create: {
						requireAuthentication: true,
						authorizedRoles: ['Client'],
					},
					read: {
						requireAuthentication: true,
						authorizedRoles: ['Client', 'Client2'],
					},
				},
			},
		])
		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		const { userClient } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client',
			rootClient,
		})

		const { userClient: userClient2 } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client2',
			rootClient,
		})

		await userClient.request<any>(gql`
			mutation createTest4 {
				createTest4(input: { fields: { name: "test" } }) {
					test4 {
						id
					}
				}
			}
		`)

		const res = await userClient2.request<any>(gql`
			query test4s {
				test4s {
					edges {
						node {
							id
							name
						}
					}
				}
			}
		`)

		expect(res.test4s.edges.length).toEqual(1)
		expect(res.test4s.edges[0].node.name).toEqual('test')

		await closeTests(wabe)
	})

	it('should access to an object created by another user without ACL', async () => {
		const setup = await setupTests([
			{
				name: 'Test4',
				fields: {
					name: { type: 'String' },
				},
				permissions: {
					create: {
						requireAuthentication: true,
						authorizedRoles: ['Client'],
					},
					read: {
						requireAuthentication: true,
						authorizedRoles: ['Client', 'Client2'],
					},
				},
			},
		])
		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		const { userClient } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client',
			rootClient,
		})

		const { userClient: userClient2 } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client2',
			rootClient,
		})

		await userClient.request<any>(gql`
			mutation createTest4 {
				createTest4(input: { fields: { name: "test" } }) {
					test4 {
						id
					}
				}
			}
		`)

		const res = await userClient2.request<any>(gql`
			query test4s {
				test4s {
					edges {
						node {
							id
							name
						}
					}
				}
			}
		`)

		expect(res.test4s.edges.length).toEqual(1)
		expect(res.test4s.edges[0].node.name).toEqual('test')

		await closeTests(wabe)
	})

	it('should authorize user to access to created object with self acl but not an other user', async () => {
		const setup = await setupTests([
			{
				name: 'Test3',
				fields: {
					name: { type: 'String' },
				},
				permissions: {
					create: {
						requireAuthentication: false,
					},
					read: {
						requireAuthentication: false,
					},
					acl: async (hookObject) => {
						await hookObject.addACL('users', {
							userId: hookObject.context.user?.id || '',
							read: true,
							write: true,
						})

						await hookObject.addACL('roles', null)
					},
				},
			},
		])
		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		const { userClient } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client',
			rootClient,
		})

		const { userClient: userClient2 } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client',
			rootClient,
			email: 'email2@test.fr',
		})

		const res = await userClient.request<any>(gql`
			mutation createTest3 {
				createTest3(input: { fields: { name: "test" } }) {
					test3 {
						id
					}
				}
			}
		`)

		const res2 = await userClient2.request<any>(gql`
			query test3s {
				test3s {
					edges {
						node {
							id
						}
					}
				}
			}
		`)

		const res3 = await getAnonymousClient(port).request<any>(gql`
			query test3s {
				test3s {
					edges {
						node {
							id
						}
					}
				}
			}
		`)

		expect(res.createTest3.test3.id).toBeDefined()
		expect(res2.test3s.edges.length).toEqual(0)
		expect(res3.test3s.edges.length).toEqual(0)

		await closeTests(wabe)
	})

	it('should not authorize create object when authorizedRoles is empty', async () => {
		const setup = await setupTests([
			{
				name: 'Test2',
				fields: {
					name: { type: 'String' },
					age: { type: 'Int' },
				},
				permissions: {
					read: {
						authorizedRoles: ['Client', 'Client2'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: [],
						requireAuthentication: true,
					},
				},
			},
		])
		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		const { userClient } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client',
			rootClient,
		})

		expect(
			userClient.request<any>(gql`
				mutation createTest2 {
					createTest2(input: { fields: { name: "test" } }) {
						test2 {
							id
						}
					}
				}
			`),
		).rejects.toThrow('Permission denied to create class Test2')

		expect(() =>
			rootClient.request<any>(gql`
				mutation createTest2 {
					createTest2(input: { fields: { name: "test" } }) {
						test2 {
							id
						}
					}
				}
			`),
		).not.toThrow()

		await closeTests(wabe)
	})

	it('should not authorize an user to read an object when the user has not access on read to the object (ACL)', async () => {
		const setup = await setupTests([
			{
				name: 'Test',
				fields: {
					name: { type: 'String' },
					pointer: {
						type: 'Pointer',
						class: 'Test2',
					},
					relation: {
						type: 'Relation',
						class: 'Test2',
					},
				},
				permissions: {
					read: {
						authorizedRoles: ['Client', 'Client2'],
						requireAuthentication: true,
					},
					update: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
					delete: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: ['Client2'],
						requireAuthentication: true,
					},
				},
			},
			{
				name: 'Test2',
				fields: {
					name: { type: 'String' },
					age: { type: 'Int' },
				},
				permissions: {
					read: {
						authorizedRoles: ['Client', 'Client2'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: [],
						requireAuthentication: true,
					},
				},
			},
		])
		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		const { userClient, userId } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client',
			rootClient,
		})

		const objectCreated = await rootClient.request<any>(gql`
			mutation createTest {
				createTest(input: { fields: { name: "test" } }) {
					test {
						id
					}
				}
			}
		`)

		const objectId = objectCreated.createTest.test.id

		await rootClient.request<any>(gql`
			mutation updateACL{
				updateTest(input:{id: "${objectId}", fields: {acl:{
					users: [{
						userId: "${userId}",
						read: false,
						write: true
					}]
				}}}){
					test{
						id
					}
				}
			}
		`)

		const res = await userClient.request<any>(gql`
			query tests {
				tests {
					edges {
						node {
							id
						}
					}
				}
			}
		`)

		expect(res.tests.edges.length).toEqual(0)

		await closeTests(wabe)
	})

	it('should not authorize an user to write (delete) an object when the user has not access on write to the object (ACL)', async () => {
		const setup = await setupTests([
			{
				name: 'Test',
				fields: {
					name: { type: 'String' },
					pointer: {
						type: 'Pointer',
						class: 'Test2',
					},
					relation: {
						type: 'Relation',
						class: 'Test2',
					},
				},
				permissions: {
					read: {
						authorizedRoles: ['Client', 'Client2'],
						requireAuthentication: true,
					},
					update: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
					delete: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: ['Client2'],
						requireAuthentication: true,
					},
				},
			},
			{
				name: 'Test2',
				fields: {
					name: { type: 'String' },
					age: { type: 'Int' },
				},
				permissions: {
					read: {
						authorizedRoles: ['Client', 'Client2'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: [],
						requireAuthentication: true,
					},
				},
			},
		])
		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		const { userClient, userId } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client',
			rootClient,
		})

		const objectCreated = await rootClient.request<any>(gql`
			mutation createTest {
				createTest(input: { fields: { name: "test" } }) {
					test {
						id
					}
				}
			}
		`)

		const objectId = objectCreated.createTest.test.id

		await rootClient.request<any>(gql`
			mutation updateACL{
				updateTest(input:{id: "${objectId}", fields: {acl:{
					users: [{
						userId: "${userId}",
						read: true,
						write: false
					}]
				}}}){
					test{
						id
					}
				}
			}
		`)

		expect(
			userClient.request<any>(gql`
				mutation deleteTest{
					deleteTest(input:{id: "${objectId}"}){
						test{
							id
						}
					}
				}
			`),
		).rejects.toThrow('Object not found')

		await closeTests(wabe)
	})

	it('should not authorize an user to get the result of mutation (read) when he has access on write but not on read (ACL)', async () => {
		const setup = await setupTests([
			{
				name: 'Test',
				fields: {
					name: { type: 'String' },
					pointer: {
						type: 'Pointer',
						class: 'Test2',
					},
					relation: {
						type: 'Relation',
						class: 'Test2',
					},
				},
				permissions: {
					read: {
						authorizedRoles: ['Client', 'Client2'],
						requireAuthentication: true,
					},
					update: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
					delete: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: ['Client2'],
						requireAuthentication: true,
					},
				},
			},
			{
				name: 'Test2',
				fields: {
					name: { type: 'String' },
					age: { type: 'Int' },
				},
				permissions: {
					read: {
						authorizedRoles: ['Client', 'Client2'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: [],
						requireAuthentication: true,
					},
				},
			},
		])
		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		const { userClient, userId } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client',
			rootClient,
		})

		const objectCreated = await rootClient.request<any>(gql`
			mutation createTest {
				createTest(input: { fields: { name: "test" } }) {
					test {
						id
					}
				}
			}
		`)

		const objectId = objectCreated.createTest.test.id

		await rootClient.request<any>(gql`
			mutation updateACL{
				updateTest(input:{id: "${objectId}", fields: {acl:{
					users: [{
						userId: "${userId}",
						read: false,
						write: true
					}]
				}}}){
					test{
						id
					}
				}
			}
		`)

		expect(
			userClient.request<any>(gql`
				mutation updateTest{
					updateTest(input:{id: "${objectId}", fields : {name: "tata"}}){
						test{
							id
						}
					}
				}
			`),
		).rejects.toThrow('Object not found')

		await closeTests(wabe)
	})

	it('should not authorize an user to write (update) an object when the user has not access on write to the object (ACL)', async () => {
		const setup = await setupTests([
			{
				name: 'Test',
				fields: {
					name: { type: 'String' },
					pointer: {
						type: 'Pointer',
						class: 'Test2',
					},
					relation: {
						type: 'Relation',
						class: 'Test2',
					},
				},
				permissions: {
					read: {
						authorizedRoles: ['Client', 'Client2'],
						requireAuthentication: true,
					},
					update: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
					delete: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: ['Client2'],
						requireAuthentication: true,
					},
				},
			},
			{
				name: 'Test2',
				fields: {
					name: { type: 'String' },
					age: { type: 'Int' },
				},
				permissions: {
					read: {
						authorizedRoles: ['Client', 'Client2'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: [],
						requireAuthentication: true,
					},
				},
			},
		])
		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		const { userClient, userId } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client',
			rootClient,
		})

		const objectCreated = await rootClient.request<any>(gql`
			mutation createTest {
				createTest(input: { fields: { name: "test" } }) {
					test {
						id
					}
				}
			}
		`)

		const objectId = objectCreated.createTest.test.id

		await rootClient.request<any>(gql`
			mutation updateACL{
				updateTest(input:{id: "${objectId}", fields: {acl:{
					users: [{
						userId: "${userId}",
						read: true,
						write: false
					}]
				}}}){
					test{
						id
					}
				}
			}
		`)

		expect(
			userClient.request<any>(gql`
				mutation updateTest{
					updateTest(input:{id: "${objectId}", fields : {name: "tata"}}){
						test{
							id
						}
					}
				}
			`),
		).rejects.toThrow('Object not found')

		await closeTests(wabe)
	})

	it('should authorize an user to read an object when the user has access on read to the object (ACL)', async () => {
		const setup = await setupTests([
			{
				name: 'Test',
				fields: {
					name: { type: 'String' },
					pointer: {
						type: 'Pointer',
						class: 'Test2',
					},
					relation: {
						type: 'Relation',
						class: 'Test2',
					},
				},
				permissions: {
					read: {
						authorizedRoles: ['Client', 'Client2'],
						requireAuthentication: true,
					},
					update: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
					delete: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: ['Client2'],
						requireAuthentication: true,
					},
				},
			},
			{
				name: 'Test2',
				fields: {
					name: { type: 'String' },
					age: { type: 'Int' },
				},
				permissions: {
					read: {
						authorizedRoles: ['Client', 'Client2'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: [],
						requireAuthentication: true,
					},
				},
			},
		])
		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		const { userClient, userId } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client',
			rootClient,
		})

		const objectCreated = await rootClient.request<any>(gql`
			mutation createTest {
				createTest(input: { fields: { name: "test" } }) {
					test {
						id
					}
				}
			}
		`)

		const objectId = objectCreated.createTest.test.id

		await rootClient.request<any>(gql`
			mutation updateACL{
				updateTest(input:{id: "${objectId}", fields: {acl:{
					users: [{
						userId: "${userId}",
						read: true,
						write: false
					}]
				}}}){
					test{
						id
					}
				}
			}
		`)

		const res = await userClient.request<any>(gql`
			query tests {
				tests {
					edges {
						node {
							id
						}
					}
				}
			}
		`)

		expect(res.tests.edges.length).toEqual(1)

		await closeTests(wabe)
	})

	it('should not authorized an user to read an object on another class with pointer when the user do not have ACL to read the other class', async () => {
		const setup = await setupTests([
			{
				name: 'Test',
				fields: {
					name: { type: 'String' },
					pointer: {
						type: 'Pointer',
						class: 'Test2',
					},
					relation: {
						type: 'Relation',
						class: 'Test2',
					},
				},
				permissions: {
					read: {
						authorizedRoles: ['Client', 'Client2'],
						requireAuthentication: true,
					},
					update: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
					delete: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: ['Client2'],
						requireAuthentication: true,
					},
				},
			},
			{
				name: 'Test2',
				fields: {
					name: { type: 'String' },
					age: { type: 'Int' },
				},
				permissions: {
					read: {
						authorizedRoles: ['Client', 'Client2'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: [],
						requireAuthentication: true,
					},
				},
			},
		])
		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		const { userClient, userId } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client',
			rootClient,
		})

		const objectCreated = await rootClient.request<any>(gql`
			mutation createTest {
				createTest(
					input: {
						fields: {
							name: "test"
							pointer: { createAndLink: { name: "tata" } }
						}
					}
				) {
					test {
						id
						pointer {
							id
						}
					}
				}
			}
		`)

		const pointerId = objectCreated.createTest.test.pointer.id
		const testId = objectCreated.createTest.test.id

		await rootClient.request<any>(gql`
			mutation updateACL{
				updateTest(input:{id: "${testId}", fields: {acl:{
					users: [{
						userId: "${userId}",
						read: true,
						write: false
					}]
				}}}){
					test{
						id
					}
				}
			}
		`)

		await rootClient.request<any>(gql`
			mutation updateACL{
				updateTest2(input:{id: "${pointerId}", fields: {acl:{
					users: [{
						userId: "${userId}",
						read: false,
						write: false
					}]
				}}}){
					test2{
						id
					}
				}
			}
		`)

		expect(
			userClient.request<any>(gql`
				query tests {
					tests {
						edges {
							node {
								id
								name
							}
						}
					}
				}
			`),
		).resolves.toEqual(expect.anything())

		expect(
			userClient.request<any>(gql`
				query tests {
					tests {
						edges {
							node {
								id
								name
								pointer {
									id
								}
							}
						}
					}
				}
			`),
		).rejects.toThrow('Object not found')

		await closeTests(wabe)
	})

	it('should not authorized an user to read an object on another class with relation when the user do not have ACL to read the other class', async () => {
		const setup = await setupTests([
			{
				name: 'Test',
				fields: {
					name: { type: 'String' },
					pointer: {
						type: 'Pointer',
						class: 'Test2',
					},
					relation: {
						type: 'Relation',
						class: 'Test2',
					},
				},
				permissions: {
					read: {
						authorizedRoles: ['Client', 'Client2'],
						requireAuthentication: true,
					},
					update: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
					delete: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: ['Client2'],
						requireAuthentication: true,
					},
				},
			},
			{
				name: 'Test2',
				fields: {
					name: { type: 'String' },
					age: { type: 'Int' },
				},
				permissions: {
					read: {
						authorizedRoles: ['Client', 'Client2'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: [],
						requireAuthentication: true,
					},
				},
			},
		])
		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		const { userClient, userId } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client',
			rootClient,
		})

		const objectCreated = await rootClient.request<any>(gql`
			mutation createTest {
				createTest(
					input: {
						fields: {
							name: "test"
							relation: { createAndAdd: [{ name: "tata" }] }
						}
					}
				) {
					test {
						id
						relation {
							edges {
								node {
									id
								}
							}
						}
					}
				}
			}
		`)

		const relationId = objectCreated.createTest.test.relation.edges[0].node.id
		const testId = objectCreated.createTest.test.id

		await rootClient.request<any>(gql`
			mutation updateACL{
				updateTest(input:{id: "${testId}", fields: {acl:{
					users: [{
						userId: "${userId}",
						read: true,
						write: false
					}]
				}}}){
					test{
						id
					}
				}
			}
		`)

		await rootClient.request<any>(gql`
			mutation updateACL{
				updateTest2(input:{id: "${relationId}", fields: {acl:{
					users: [{
						userId: "${userId}",
						read: false,
						write: false
					}]
				}}}){
					test2{
						id
					}
				}
			}
		`)

		expect(
			userClient.request<any>(gql`
				query tests {
					tests {
						edges {
							node {
								id
								name
							}
						}
					}
				}
			`),
		).resolves.toEqual(expect.anything())

		const res = await userClient.request<any>(gql`
			query tests {
				tests {
					edges {
						node {
							id
							name
							relation {
								edges {
									node {
										id
									}
								}
							}
						}
					}
				}
			}
		`)

		expect(res.tests.edges[0].node.relation.edges.length).toEqual(0)

		await closeTests(wabe)
	})

	it('should not authorize an user to create an object on another class with pointer when the user do not have access to write the other class with (CLP)', async () => {
		const setup = await setupTests([
			{
				name: 'Test',
				fields: {
					name: { type: 'String' },
					pointer: {
						type: 'Pointer',
						class: 'Test2',
					},
					relation: {
						type: 'Relation',
						class: 'Test2',
					},
				},
				permissions: {
					read: {
						authorizedRoles: ['Client', 'Client2'],
						requireAuthentication: true,
					},
					update: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
					delete: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: ['Client2'],
						requireAuthentication: true,
					},
				},
			},
			{
				name: 'Test2',
				fields: {
					name: { type: 'String' },
					age: { type: 'Int' },
				},
				permissions: {
					read: {
						authorizedRoles: ['Client', 'Client2'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: [],
						requireAuthentication: true,
					},
				},
			},
		])
		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		const { userClient } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client2',
			rootClient,
		})

		expect(
			userClient.request<any>(gql`
				mutation createTest {
					createTest(
						input: {
							fields: {
								name: "test"
								pointer: { createAndLink: { name: "tata" } }
							}
						}
					) {
						test {
							id
							pointer {
								id
							}
						}
					}
				}
			`),
		).rejects.toThrow('Permission denied to create class Test2')

		await closeTests(wabe)
	})

	it('should authorize a connected user to access to a protected resource', async () => {
		const setup = await setupTests([
			{
				name: 'Test',
				fields: {
					name: { type: 'String' },
					pointer: {
						type: 'Pointer',
						class: 'Test2',
					},
					relation: {
						type: 'Relation',
						class: 'Test2',
					},
				},
				permissions: {
					read: {
						authorizedRoles: ['Client', 'Client2'],
						requireAuthentication: true,
					},
					update: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
					delete: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: ['Client2'],
						requireAuthentication: true,
					},
				},
			},
			{
				name: 'Test2',
				fields: {
					name: { type: 'String' },
					age: { type: 'Int' },
				},
				permissions: {
					read: {
						authorizedRoles: ['Client', 'Client2'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: [],
						requireAuthentication: true,
					},
				},
			},
		])
		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		const { userClient } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client',
			rootClient,
		})

		const resOfTest = await userClient.request<any>(gql`
			query tests {
				tests {
					edges {
						node {
							id
						}
					}
				}
			}
		`)

		expect(resOfTest.tests.edges.length).toEqual(0)

		await closeTests(wabe)
	})

	it('should authorize a connected user to access to protected resource after the user refresh his token', async () => {
		const setup = await setupTests([
			{
				name: 'Test',
				fields: {
					name: { type: 'String' },
					pointer: {
						type: 'Pointer',
						class: 'Test2',
					},
					relation: {
						type: 'Relation',
						class: 'Test2',
					},
				},
				permissions: {
					read: {
						authorizedRoles: ['Client', 'Client2'],
						requireAuthentication: true,
					},
					update: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
					delete: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: ['Client2'],
						requireAuthentication: true,
					},
				},
			},
			{
				name: 'Test2',
				fields: {
					name: { type: 'String' },
					age: { type: 'Int' },
				},
				permissions: {
					read: {
						authorizedRoles: ['Client', 'Client2'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: [],
						requireAuthentication: true,
					},
				},
			},
		])
		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		const { userClient, refreshToken, accessToken } =
			await createUserAndUpdateRole({
				anonymousClient: client,
				port,
				roleName: 'Client',
				rootClient,
			})

		const resAfterRefresh = await userClient.request<any>(graphql.refresh, {
			input: {
				accessToken,
				refreshToken,
			},
		})

		const userClientAfterRefresh = getUserClient(port, {
			accessToken: resAfterRefresh.refresh.accessToken,
		})

		const resOfTest = await userClientAfterRefresh.request<any>(gql`
			query tests {
				tests {
					edges {
						node {
							id
						}
					}
				}
			}
		`)

		expect(resOfTest.tests.edges.length).toEqual(0)

		await closeTests(wabe)
	})

	it('should not authorize to access to protected resource if the user is not connected', async () => {
		const setup = await setupTests([
			{
				name: 'Test',
				fields: {
					name: { type: 'String' },
					pointer: {
						type: 'Pointer',
						class: 'Test2',
					},
					relation: {
						type: 'Relation',
						class: 'Test2',
					},
				},
				permissions: {
					read: {
						authorizedRoles: ['Client', 'Client2'],
						requireAuthentication: true,
					},
					update: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
					delete: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: ['Client2'],
						requireAuthentication: true,
					},
				},
			},
			{
				name: 'Test2',
				fields: {
					name: { type: 'String' },
					age: { type: 'Int' },
				},
				permissions: {
					read: {
						authorizedRoles: ['Client', 'Client2'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: [],
						requireAuthentication: true,
					},
				},
			},
		])
		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client3',
			rootClient,
		})

		const userClient = getUserClient(port, { accessToken: 'invalidToken' })

		expect(
			userClient.request<any>(gql`
				query tests {
					tests {
						edges {
							node {
								id
							}
						}
					}
				}
			`),
		).rejects.toThrow('Permission denied to read class Test')

		await closeTests(wabe)
	})

	it("should not authorized to read an object if the user doesn't had an authorized role (read one)", async () => {
		const setup = await setupTests([
			{
				name: 'Test',
				fields: {
					name: { type: 'String' },
					pointer: {
						type: 'Pointer',
						class: 'Test2',
					},
					relation: {
						type: 'Relation',
						class: 'Test2',
					},
				},
				permissions: {
					read: {
						authorizedRoles: ['Client', 'Client2'],
						requireAuthentication: true,
					},
					update: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
					delete: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: ['Client2'],
						requireAuthentication: true,
					},
				},
			},
			{
				name: 'Test2',
				fields: {
					name: { type: 'String' },
					age: { type: 'Int' },
				},
				permissions: {
					read: {
						authorizedRoles: ['Client', 'Client2'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: [],
						requireAuthentication: true,
					},
				},
			},
		])
		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		const { userClient } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client3',
			rootClient,
		})

		const res = await rootClient.request<any>(gql`
			mutation createTest {
				createTest(input: { fields: { name: "test" } }) {
					test {
						id
					}
				}
			}
		`)

		const testId = res.createTest.test.id

		expect(
			userClient.request<any>(gql`
			query test{
				test(id: "${testId}") {
					id
				}
			}
		`),
		).rejects.toThrow('Permission denied to read class Test')

		await closeTests(wabe)
	})

	it("should not authorized to read an object if the user doesn't had an authorized role (read many)", async () => {
		const setup = await setupTests([
			{
				name: 'Test',
				fields: {
					name: { type: 'String' },
					pointer: {
						type: 'Pointer',
						class: 'Test2',
					},
					relation: {
						type: 'Relation',
						class: 'Test2',
					},
				},
				permissions: {
					read: {
						authorizedRoles: ['Client', 'Client2'],
						requireAuthentication: true,
					},
					update: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
					delete: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: ['Client2'],
						requireAuthentication: true,
					},
				},
			},
			{
				name: 'Test2',
				fields: {
					name: { type: 'String' },
					age: { type: 'Int' },
				},
				permissions: {
					read: {
						authorizedRoles: ['Client', 'Client2'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: [],
						requireAuthentication: true,
					},
				},
			},
		])
		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		const { userClient } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client3',
			rootClient,
		})

		expect(
			userClient.request<any>(gql`
				query tests {
					tests {
						edges {
							node {
								id
							}
						}
					}
				}
			`),
		).rejects.toThrow('Permission denied to read class Test')

		await closeTests(wabe)
	})

	it("should not authorized to delete an object if the user doesn't had an authorized role (delete)", async () => {
		const setup = await setupTests([
			{
				name: 'Test',
				fields: {
					name: { type: 'String' },
					pointer: {
						type: 'Pointer',
						class: 'Test2',
					},
					relation: {
						type: 'Relation',
						class: 'Test2',
					},
				},
				permissions: {
					read: {
						authorizedRoles: ['Client', 'Client2'],
						requireAuthentication: true,
					},
					update: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
					delete: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: ['Client2'],
						requireAuthentication: true,
					},
				},
			},
			{
				name: 'Test2',
				fields: {
					name: { type: 'String' },
					age: { type: 'Int' },
				},
				permissions: {
					read: {
						authorizedRoles: ['Client', 'Client2'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: [],
						requireAuthentication: true,
					},
				},
			},
		])
		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		const { userClient } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client2',
			rootClient,
		})

		await rootClient.request<any>(gql`
			mutation createTest {
				createTest(input: { fields: { name: "test" } }) {
					test {
						id
					}
				}
			}
		`)

		expect(
			userClient.request<any>(gql`
				mutation deleteTests {
					deleteTests(
						input: { where: { name: { equalTo: "test" } } }
					) {
						edges {
							node {
								id
							}
						}
					}
				}
			`),
		).rejects.toThrow('Permission denied to delete class Test')

		await closeTests(wabe)
	})

	it("should not authorized to create an object if the user doesn't had an authorized role (create)", async () => {
		const setup = await setupTests([
			{
				name: 'Test',
				fields: {
					name: { type: 'String' },
					pointer: {
						type: 'Pointer',
						class: 'Test2',
					},
					relation: {
						type: 'Relation',
						class: 'Test2',
					},
				},
				permissions: {
					read: {
						authorizedRoles: ['Client', 'Client2'],
						requireAuthentication: true,
					},
					update: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
					delete: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: ['Client2'],
						requireAuthentication: true,
					},
				},
			},
			{
				name: 'Test2',
				fields: {
					name: { type: 'String' },
					age: { type: 'Int' },
				},
				permissions: {
					read: {
						authorizedRoles: ['Client', 'Client2'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: [],
						requireAuthentication: true,
					},
				},
			},
		])
		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		const { userClient } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client',
			rootClient,
		})

		expect(
			userClient.request<any>(gql`
				mutation createTest2 {
					createTest2(input: { fields: { name: "test" } }) {
						test2 {
							id
						}
					}
				}
			`),
		).rejects.toThrow('Permission denied to create class Test')

		await closeTests(wabe)
	})

	it("should not authorized to udpdate an object if the user doesn't had an authorized role (update)", async () => {
		const setup = await setupTests([
			{
				name: 'Test',
				fields: {
					name: { type: 'String' },
					pointer: {
						type: 'Pointer',
						class: 'Test2',
					},
					relation: {
						type: 'Relation',
						class: 'Test2',
					},
				},
				permissions: {
					read: {
						authorizedRoles: ['Client', 'Client2'],
						requireAuthentication: true,
					},
					update: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
					delete: {
						authorizedRoles: ['Client'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: ['Client2'],
						requireAuthentication: true,
					},
				},
			},
			{
				name: 'Test2',
				fields: {
					name: { type: 'String' },
					age: { type: 'Int' },
				},
				permissions: {
					read: {
						authorizedRoles: ['Client', 'Client2'],
						requireAuthentication: true,
					},
					create: {
						authorizedRoles: [],
						requireAuthentication: true,
					},
				},
			},
		])
		wabe = setup.wabe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)

		const { userClient } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client2',
			rootClient,
		})

		const res = await rootClient.request<any>(gql`
			mutation createTest {
				createTest(input: { fields: { name: "test" } }) {
					test {
						id
					}
				}
			}
		`)

		expect(
			userClient.request<any>(gql`
			mutation updateTest{
				updateTest(input: {id: "${res.createTest.test.id}", fields : {name: "tata"}}){
					test{
						id
					}
				}
			}
		`),
		).rejects.toThrow('Permission denied to update class Test')

		await closeTests(wabe)
	})
})

const graphql = {
	deleteTests: gql`
		mutation deleteTests {
			deleteTests(input: { where: { name: { equalTo: "test" } } }) {
				edges {
					node {
						id
					}
				}
			}
		}
	`,
	deleteUsers: gql`
		mutation deleteUser {
			deleteUsers(
				input: {
					where: {
						authentication: {
							emailPassword: {
								email: { equalTo: "email@test.fr" }
							}
						}
					}
				}
			) {
				edges {
					node {
						id
					}
				}
			}
		}
	`,
	signInWith: gql`
		mutation signInWith($input: SignInWithInput!) {
			signInWith(input: $input) {
				id
				accessToken
				refreshToken
			}
		}
	`,
	signUpWith: gql`
		mutation signUpWith($input: SignUpWithInput!) {
			signUpWith(input: $input) {
				id
				accessToken
				refreshToken
			}
		}
	`,
	signOut: gql`
		mutation signOut {
			signOut
		}
	`,
	refresh: gql`
		mutation refresh($input: RefreshInput!) {
			refresh(input: $input) {
				accessToken
				refreshToken
			}
		}
	`,
}
