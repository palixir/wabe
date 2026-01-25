import {
	describe,
	beforeAll,
	afterAll,
	it,
	expect,
	afterEach,
	mock,
} from 'bun:test'
import { gql, type GraphQLClient } from 'graphql-request'
import {
	getAnonymousClient,
	getGraphqlClient,
	getUserClient,
	type DevWabeTypes,
} from '../utils/helper'
import { setupTests, closeTests } from '../utils/testHelper'
import type { Wabe } from '../server'

const createUserAndUpdateRole = async ({
	anonymousClient,
	rootClient,
	roleName,
	port,
}: {
	port: number
	anonymousClient: GraphQLClient
	rootClient: GraphQLClient
	roleName: string
}) => {
	const res = await anonymousClient.request<any>(graphql.signUpWith, {
		input: {
			authentication: {
				emailPassword: {
					email: 'email@test.fr',
					password: 'password',
				},
			},
		},
	})

	const resOfRoles = await rootClient.request<any>(gql`
			query getRoles {
					roles(where: {name: {equalTo: "${roleName}"}}) {
			    edges {
		    			node {
		     			 	id
		    			}
		  			}
					}
			}
		`)

	const roleId = resOfRoles.roles.edges[0].node.id

	await rootClient.request<any>(gql`
			mutation updateUser {
			  updateUser(input: {id: "${res.signUpWith.id}", fields: {role: {link: "${roleId}"}}}) {
		  			user {
		    			id
		  			}
					}
			}
		`)

	const userClient = getUserClient(port, {
		accessToken: res.signUpWith.accessToken,
	})

	return {
		userClient,
		roleId,
		userId: res.signUpWith.id,
		accessToken: res.signUpWith.accessToken,
		refreshToken: res.signUpWith.refreshToken,
	}
}

const getRoleNameFromId = async (roleId: string, rootClient: GraphQLClient) => {
	const resOfRoles = await rootClient.request<any>(gql`
			query getRoles {
					roles(where: {id: {equalTo: "${roleId}"}}) {
			    edges {
		    			node {
		     			 	name
		    			}
		  			}
					}
			}
		`)

	return resOfRoles.roles.edges[0].node.name
}

describe('setupAcl', () => {
	let wabe: Wabe<DevWabeTypes>
	let port: number
	let anonymousClient: GraphQLClient
	let rootClient: GraphQLClient

	const mockCallback = mock(() => {})

	beforeAll(async () => {
		const setup = await setupTests([
			{
				name: 'SetupACL',
				fields: {
					test: {
						type: 'String',
					},
				},
				permissions: {
					create: {
						requireAuthentication: false,
					},
					acl: async (hookObject) => {
						await hookObject.addACL('users', {
							userId: hookObject.context.user?.id || '',
							read: true,
							write: true,
						})

						await hookObject.addACL('roles', {
							// @ts-expect-error
							role: 'Client',
							read: true,
							write: true,
						})
					},
				},
			},
			{
				name: 'SetupACL2',
				fields: {
					test: {
						type: 'String',
					},
				},
				permissions: {
					create: {
						requireAuthentication: false,
					},
				},
			},
			{
				name: 'SetupACL3',
				fields: {
					test: {
						type: 'String',
					},
				},
				permissions: {
					create: {
						requireAuthentication: false,
					},
					acl: async (hookObject) => {
						await hookObject.addACL('users', null)
						await hookObject.addACL('roles', null)
					},
				},
			},
			{
				name: 'SetupACL4',
				fields: {
					test: {
						type: 'String',
					},
				},
				permissions: {
					create: {
						requireAuthentication: false,
					},
					acl: mockCallback,
				},
			},
			{
				name: 'SetupACL5',
				fields: {
					test: {
						type: 'String',
					},
				},
				permissions: {
					create: {
						requireAuthentication: false,
					},
					acl: async (hookObject) => {
						await hookObject.addACL('users', null)

						await hookObject.addACL('roles', {
							// @ts-expect-error
							role: 'Client',
							read: true,
							write: false,
						})

						await hookObject.addACL('roles', {
							// @ts-expect-error
							role: 'Client2',
							read: false,
							write: true,
						})
					},
				},
			},
			{
				name: 'SetupACL6',
				fields: {
					test: {
						type: 'String',
					},
				},
				permissions: {
					create: {
						requireAuthentication: false,
					},
					acl: async (hookObject) => {
						await hookObject.addACL('users', {
							userId: hookObject.context.user?.id || '',
							read: true,
							write: true,
						})

						await hookObject.addACL('roles', {
							// @ts-expect-error
							role: 'Client',
							read: true,
							write: true,
						})
					},
				},
			},
			{
				name: 'SetupACL7',
				fields: {
					test: {
						type: 'String',
					},
				},
				permissions: {
					create: {
						requireAuthentication: false,
					},
					acl: async (hookObject) => {
						await hookObject.addACL('users', {
							userId: hookObject.context.user?.id || '',
							read: true,
							write: true,
						})

						await hookObject.addACL('roles', {
							// @ts-expect-error
							role: 'Client',
							read: true,
							write: true,
						})
					},
				},
			},
			{
				name: 'SetupACL8',
				fields: {
					test: {
						type: 'String',
					},
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

						await hookObject.addACL('roles', {
							// @ts-expect-error
							role: 'Client',
							read: true,
							write: true,
						})
					},
				},
			},
		])

		wabe = setup.wabe

		port = setup.port
		anonymousClient = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)
	})

	afterAll(async () => {
		await closeTests(wabe)
	})

	afterEach(async () => {
		await rootClient.request<any>(graphql.deleteUsers)
	})

	it('should not access to an object created with anonymous client when only user that create the object can access to it with ACL', async () => {
		await anonymousClient.request<any>(gql`
        mutation createUser {
          createUser(input:{fields:{name: "test" }}){
            user{
              id
              acl {
                  users {
                      userId
                  }
              }
            }
          }
        }
    `)

		const res = await rootClient.request<any>(gql`
        query users {
            users (where: {name: {equalTo: "test"}}) {
              edges {
                node {
                  id
                  acl {
                    users {
                      userId
                    }
                  }
                }
              }
            }
        }
      `)

		expect(res.users.edges[0].node.acl).not.toBeNull()
	})

	it('should add acl object with to owner (with role client2) is authenticated (on read)', async () => {
		const { userClient, userId } = await createUserAndUpdateRole({
			anonymousClient,
			port,
			roleName: 'Client2',
			rootClient,
		})

		const setupResult = await userClient.request<any>(gql`
        mutation createSetupACL8 {
          createSetupACL8(input: {fields: {test: "test"}}) {
            setupACL8 {
              id
              acl {
                users {
                  userId
                  read
                  write
                }
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

		const res = await rootClient.request<any>(gql`
          query setupACL8 {
              setupACL8(id: "${setupResult.createSetupACL8.setupACL8.id}") {
                id
                acl {
                  users {
                    userId
                    read
                    write
                  }
                  roles {
                    roleId
                    read
                    write
                  }
                }
              }
            }
          `)

		// User
		expect(res.setupACL8.acl.users[0].userId).toEqual(userId)
		expect(res.setupACL8.acl.users[0].read).toEqual(true)
		expect(res.setupACL8.acl.users[0].write).toEqual(true)

		// Role
		expect(
			await getRoleNameFromId(res.setupACL8.acl.roles[0].roleId, rootClient),
		).toEqual('Client')
		expect(res.setupACL8.acl.roles[0].read).toEqual(true)
		expect(res.setupACL8.acl.roles[0].write).toEqual(true)
	})

	it('should not update acl object if the acl function is not present in permissions in the class', async () => {
		const res = await rootClient.request<any>(gql`
        mutation createSetupACL2 {
          createSetupACL2(input: {fields: {test: "test"}}) {
            setupACL2 {
              id
              acl {
                users {
                  userId
                  read
                  write
                }
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

		expect(res.createSetupACL2.setupACL2.acl).toBeNull()
	})

	it('should set read and write to false if the null value is provided for users and roles', async () => {
		await rootClient.request<any>(gql`
        mutation createSetupACL3 {
          createSetupACL3(input: {fields: {test: "test"}}) {
            setupACL3 {
              id
            }
          }
        }
    `)

		const res = await rootClient.request<any>(gql`
        query setupACL3s {
            setupACL3s {
              edges {
                node {
                  id
                  acl {
                    users {
                      userId
                      read
                      write
                    }
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

		// User
		expect(res.setupACL3s.edges[0].node.acl.users).toHaveLength(0)

		// Role
		expect(res.setupACL3s.edges[0].node.acl.roles).toHaveLength(0)
	})

	it('should call acl function if provided', async () => {
		await rootClient.request<any>(gql`
        mutation createSetupACL4 {
          createSetupACL4(input: {fields: {test: "test"}}) {
            setupACL4 {
              id
            }
          }
        }
    `)

		expect(mockCallback).toHaveBeenCalledTimes(1)
	})

	it('should get different role id for read and write if roles are different', async () => {
		const setupResult = await rootClient.request<any>(gql`
        mutation createSetupACL5 {
          createSetupACL5(input: {fields: {test: "test"}}) {
            setupACL5 {
              id
              acl {
                users {
                  userId
                  read
                  write
                }
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

		const res = await rootClient.request<any>(gql`
          query setupACL5 {
              setupACL5(id: "${setupResult.createSetupACL5.setupACL5.id}") {
                id
                acl {
                  users {
                    userId
                    read
                    write
                  }
                  roles {
                    roleId
                    read
                    write
                  }
                }
              }
            }
          `)

		expect(res.setupACL5.acl.users).toHaveLength(0)

		// Role
		expect(
			await getRoleNameFromId(res.setupACL5.acl.roles[0].roleId, rootClient),
		).toEqual('Client')

		expect(
			await getRoleNameFromId(res.setupACL5.acl.roles[1].roleId, rootClient),
		).toEqual('Client2')
	})

	it('should not setup acl if the acl field is already provided in the creation', async () => {
		await rootClient.request<any>(gql`
        mutation createSetupACL6 {
          createSetupACL6(input: {fields: {test: "test", acl: {users: [{userId: "test", read: true, write: true}], roles: [{roleId: "test", read: true, write: true}]}}}) {
            setupACL6 {
              id
              acl {
                users {
                  userId
                  read
                  write
                }
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

		const res = await rootClient.request<any>(gql`
        query setupACLs {
            setupACL6s{
              edges {
                node {
                  id
                  acl {
                    users {
                      userId
                      read
                      write
                    }
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

		expect(res.setupACL6s.edges[0].node.acl).toEqual({
			users: [{ userId: 'test', read: true, write: true }],
			roles: [{ roleId: 'test', read: true, write: true }],
		})
	})
})

const graphql = {
	deleteUsers: gql`
		mutation deleteUser {
  		deleteUsers(
    		input: {where: {authentication: {emailPassword: {email: {equalTo: "email@test.fr"}}}}}
  		) {
    		edges {
      		node {
        		id
      		}
    		}
  		}
		}
	`,
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
