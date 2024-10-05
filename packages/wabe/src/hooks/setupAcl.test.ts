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
  closeTests,
  getAnonymousClient,
  getGraphqlClient,
  getUserClient,
  setupTests,
  type DevWabeTypes,
} from '../utils/helper'
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

  const userClient = getUserClient(port, res.signUpWith.accessToken)

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
          acl: {
            authorizedUsers: {
              read: ['self'],
              write: ['self'],
            },
            authorizedRoles: {
              read: ['Client'],
              write: ['Client'],
            },
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
        permissions: {},
      },
      {
        name: 'SetupACL3',
        fields: {
          test: {
            type: 'String',
          },
        },
        permissions: {
          acl: {
            authorizedUsers: {
              read: [],
              write: [],
            },
            authorizedRoles: {
              read: [],
              write: [],
            },
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
          acl: {
            callback: mockCallback,
          },
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
          acl: {
            authorizedUsers: {
              read: [],
              write: [],
            },
            authorizedRoles: {
              read: ['Client'],
              write: ['Client2'],
            },
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
    await rootClient.request<any>(graphql.deleteTests)
  })

  it('should update acl object if self is precised and user (with role client2) is authenticated (on read)', async () => {
    const { userClient, userId } = await createUserAndUpdateRole({
      anonymousClient,
      port,
      roleName: 'Client2',
      rootClient,
    })

    const res = await userClient.request<any>(gql`
        mutation createSetupACL {
          createSetupACL(input: {fields: {test: "test"}}) {
            setupACL {
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

    // User
    expect(res.createSetupACL.setupACL.acl.users[0].userId).toEqual(userId)
    expect(res.createSetupACL.setupACL.acl.users[0].read).toEqual(true)
    expect(res.createSetupACL.setupACL.acl.users[0].write).toEqual(true)

    // Role
    expect(
      await getRoleNameFromId(
        res.createSetupACL.setupACL.acl.roles[0].roleId,
        rootClient,
      ),
    ).toEqual('Client')
    expect(res.createSetupACL.setupACL.acl.roles[0].read).toEqual(true)
    expect(res.createSetupACL.setupACL.acl.roles[0].write).toEqual(true)
  })

  it('should not update acl object if the acl object is not present in permissions in the class', async () => {
    const { userClient } = await createUserAndUpdateRole({
      anonymousClient,
      port,
      roleName: 'Client',
      rootClient,
    })

    const res = await userClient.request<any>(gql`
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

  it('should set read and write to false if the array is empty', async () => {
    const { userClient } = await createUserAndUpdateRole({
      anonymousClient,
      port,
      roleName: 'Client',
      rootClient,
    })

    expect(
      userClient.request<any>(gql`
        mutation createSetupACL3 {
          createSetupACL3(input: {fields: {test: "test"}}) {
            setupACL3 {
              id
            }
          }
        }
    `),
      // The object is create but the user doesn't have right to read it LOL
    ).rejects.toThrow('Object not found')

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

  it('should call callback function if provided', async () => {
    const { userClient } = await createUserAndUpdateRole({
      anonymousClient,
      port,
      roleName: 'Client',
      rootClient,
    })

    await userClient.request<any>(gql`
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

  it('should get different role id for read and write if authorizedRoles are different', async () => {
    const { userClient } = await createUserAndUpdateRole({
      anonymousClient,
      port,
      roleName: 'Client',
      rootClient,
    })

    const res = await userClient.request<any>(gql`
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

    expect(res.createSetupACL5.setupACL5.acl.users).toHaveLength(0)

    // Role
    expect(
      await getRoleNameFromId(
        res.createSetupACL5.setupACL5.acl.roles[0].roleId,
        rootClient,
      ),
    ).toEqual('Client')

    expect(
      await getRoleNameFromId(
        res.createSetupACL5.setupACL5.acl.roles[1].roleId,
        rootClient,
      ),
    ).toEqual('Client2')
  })
})

const graphql = {
  deleteTests: gql`
		mutation deleteTests {
  		deleteTests(
    		input: {where: {name: {equalTo: "test"}}}
  		) {
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
  signInWith: gql`
		 mutation signInWith($input: SignInWithInput!) {
  		signInWith(input: $input){
  			id
  			accessToken
  			refreshToken
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
