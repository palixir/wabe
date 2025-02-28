import { describe, beforeAll, afterAll, it, expect, beforeEach } from 'bun:test'
import { gql, type GraphQLClient } from 'graphql-request'
import type { Wabe } from './server'
import {
  type DevWabeTypes,
  setupTests,
  closeTests,
  getAdminUserClient,
  getGraphqlClient,
  getUserClient,
  getAnonymousClient,
} from './utils/helper'

const createUserAndUpdateRole = async ({
  anonymousClient,
  rootClient,
  roleName,
  port,
  email,
}: {
  port: number
  anonymousClient: GraphQLClient
  rootClient: GraphQLClient
  roleName: string
  email?: string
}) => {
  const random = Math.random().toString(36).substring(2)

  const res = await anonymousClient.request<any>(graphql.signUpWith, {
    input: {
      authentication: {
        emailPassword: {
          email: email || `email${random}@test.fr`,
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

  const userClient = getUserClient(port, res.signUpWith.accessToken)

  return {
    userClient,
    roleId,
    userId: res.signUpWith.id,
    accessToken: res.signUpWith.accessToken,
    refreshToken: res.signUpWith.refreshToken,
  }
}

describe('Security tests', () => {
  let wabe: Wabe<DevWabeTypes>
  let port: number

  beforeAll(async () => {
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
        },
      },
    ])
    wabe = setup.wabe
    port = wabe.config.port
  })

  afterAll(async () => {
    await closeTests(wabe)
  })

  beforeEach(async () => {
    await wabe.controllers.database.clearDatabase()
  })

  it("should not be able to access to a relation if user doesn't have access on read", async () => {
    const rootClient = getGraphqlClient(port)

    await rootClient.request<any>(gql`
        mutation createTest2{
            createTest2(input: {fields: {field1: {createAndAdd: [{name: "toto"}]}}}){
                test2{
                    id
                }
            }
        }
    `)

    const { userClient } = await createUserAndUpdateRole({
      anonymousClient: getAnonymousClient(port),
      port,
      roleName: 'Client',
      rootClient,
    })

    expect(
      userClient.request(gql`
      query test2s{
          test2s {
              edges {
                  node {
                      id
                      field1{
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
  })

  it("should not be able to access to a pointer if user doesn't have access on read", async () => {
    const rootClient = getGraphqlClient(port)

    await rootClient.request<any>(gql`
        mutation createTest2{
            createTest2(input: {fields: {field2: {createAndLink: {name: "toto"}}}}){
                test2{
                    id
                }
            }
        }
    `)

    const { userClient } = await createUserAndUpdateRole({
      anonymousClient: getAnonymousClient(port),
      port,
      roleName: 'Client',
      rootClient,
    })

    expect(
      userClient.request(gql`
      query test2s{
          test2s {
              edges {
                  node {
                      id
                      field2{
                          id
                      }
                  }
              }
          }
      }
      `),
    ).rejects.toThrow('Permission denied to read class Test1')
  })

  it('should not be able to create / update / delete a role (except root)', async () => {
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
        createRole(input: { fields: {name: "Admin2"} }) {
            role {
             id
            }
        }
      }
    `),
    ).rejects.toThrowError('Permission denied to create class Role')
  })

  it('should not be able to create / update / delete a session (except root)', async () => {
    const adminClient = await getAdminUserClient(wabe.config.port, wabe, {
      email: 'admin@wabe.dev',
      password: 'admin',
    })

    expect(
      adminClient.request<any>(gql`
      mutation create_Session {
        create_Session(input: { fields: {accessToken: "token"} }) {
            _session {
             id
            }
        }
      }
    `),
    ).rejects.toThrowError('Permission denied to create class _Session')

    const session = await wabe.controllers.database.createObject({
      className: '_Session',
      context: {
        wabe,
        isRoot: true,
      },
      data: {
        accessToken: 'token',
      },
      select: { id: true },
    })

    const sessionId = session?.id

    if (!sessionId) throw new Error('Session not created')

    expect(
      adminClient.request<any>(gql`
      mutation update_Session {
        update_Session(input: { id: "${sessionId}", fields: {accessToken: "token2"} }) {
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
    ).rejects.toThrowError('Permission denied to delete class _Session')

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
  })

  it('should not be able to do some actions with expired session', async () => {
    const adminClient = await getAdminUserClient(wabe.config.port, wabe, {
      email: 'admin@wabe.dev',
      password: 'admin',
    })

    expect(
      adminClient.request(gql`
      mutation createTest1{
          createTest1(input: {fields: {name: "test1"}}) {
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
      mutation createTest1{
          createTest1(input: {fields: {name: "test1"}}) {
              test1 {
                  id
              }
          }
      }
      `),
    ).rejects.toThrow('Permission denied to create class Test1')
  })

  it('should be able to refresh session if refresh token is not expired but access token expired', async () => {
    const adminClient = await getAdminUserClient(wabe.config.port, wabe, {
      email: 'admin@wabe.dev',
      password: 'admin',
    })

    expect(
      adminClient.request(gql`
      mutation createTest1{
          createTest1(input: {fields: {name: "test1"}}) {
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
      mutation createTest1{
          createTest1(input: {fields: {name: "test1"}}) {
              test1 {
                  id
              }
          }
      }
      `),
    ).resolves.toEqual(expect.anything())
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
