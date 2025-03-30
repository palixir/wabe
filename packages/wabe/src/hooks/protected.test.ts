import { describe, expect, it, beforeAll, afterAll } from 'bun:test'
import {
  createUserAndUpdateRole,
  type DevWabeTypes,
  getAnonymousClient,
  getGraphqlClient,
} from '../utils/helper'
import { setupTests, closeTests } from '../utils/testHelper'
import type { Wabe } from '../server'
import { RoleEnum } from '../../generated/wabe'
import { gql, type GraphQLClient } from 'graphql-request'

describe('Protected hook', () => {
  let wabe: Wabe<DevWabeTypes>
  let anonymousClient: GraphQLClient
  let rootClient: GraphQLClient

  beforeAll(async () => {
    const setup = await setupTests([
      {
        name: 'Test',
        fields: {
          name: {
            type: 'String',
            protected: {
              authorizedRoles: [RoleEnum.Client],
              protectedOperations: ['update', 'read'],
            },
          },
          noOne: {
            type: 'String',
            protected: {
              authorizedRoles: [],
              protectedOperations: ['update', 'read'],
            },
          },
          rootOnly: {
            type: 'String',
            protected: {
              authorizedRoles: ['rootOnly'],
              protectedOperations: ['update', 'read'],
            },
          },
          notOperation: {
            type: 'String',
            protected: {
              authorizedRoles: [RoleEnum.Client],
              protectedOperations: ['update'],
            },
          },
          notOperationUpdate: {
            type: 'String',
            protected: {
              authorizedRoles: [RoleEnum.Client],
              protectedOperations: ['read'],
            },
          },
        },
        permissions: {
          read: {
            authorizedRoles: ['everyone'],
            requireAuthentication: true,
          },
          create: {
            authorizedRoles: ['everyone'],
            requireAuthentication: true,
          },
          update: {
            authorizedRoles: ['everyone'],
            requireAuthentication: true,
          },
        },
      },
    ])
    wabe = setup.wabe
    anonymousClient = getAnonymousClient(setup.port)
    rootClient = getGraphqlClient(setup.port)
  })

  afterAll(async () => {
    await closeTests(wabe)
  })

  it('should not throw an error if the operation in not in the list of protected operations (read)', async () => {
    const { userClient } = await createUserAndUpdateRole({
      anonymousClient,
      rootClient,
      roleName: RoleEnum.Client,
      port: wabe.config.port,
    })

    const { userClient: userClient2 } = await createUserAndUpdateRole({
      anonymousClient,
      rootClient,
      roleName: RoleEnum.Admin,
      port: wabe.config.port,
    })

    await userClient.request<any>(gql`
      mutation createTest {
          createTest(input: {fields: {name: "test"}}) {
              test {
                  name
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
                     notOperation
                 }
             }
         }
     }
     `),
    ).resolves.toEqual(expect.anything())

    expect(
      userClient2.request<any>(gql`
     query tests {
         tests {
             edges {
                 node {
                     notOperation
                 }
             }
         }
     }
     `),
    ).resolves.toEqual(expect.anything())
  })

  it('should not throw an error if the operation in not in the list of protected operations (update)', async () => {
    const { userClient } = await createUserAndUpdateRole({
      anonymousClient,
      rootClient,
      roleName: RoleEnum.Client,
      port: wabe.config.port,
    })

    const { userClient: userClient2 } = await createUserAndUpdateRole({
      anonymousClient,
      rootClient,
      roleName: RoleEnum.Admin,
      port: wabe.config.port,
    })

    const res = await userClient.request<any>(gql`
      mutation createTest {
          createTest(input: {fields: {name: "test"}}) {
              test {
                  id
                  name
              }
          }
      }
      `)

    expect(
      userClient.request<any>(gql`
          mutation updateTest {
              updateTest(input: {id: "${res.createTest.test.id}", fields: {notOperationUpdate: "test2"}}) {
                  ok
             }
          }
     `),
    ).resolves.toEqual(expect.anything())

    expect(
      userClient2.request<any>(gql`
          mutation updateTest {
              updateTest(input: {id: "${res.createTest.test.id}", fields: {notOperationUpdate: "test2"}}) {
                  ok
             }
          }
     `),
    ).resolves.toEqual(expect.anything())
  })

  it("should throw an error if the user doesn't have the right role on read", async () => {
    const { userClient } = await createUserAndUpdateRole({
      anonymousClient,
      rootClient,
      roleName: RoleEnum.Client,
      port: wabe.config.port,
    })

    const { userClient: userClient2 } = await createUserAndUpdateRole({
      anonymousClient,
      rootClient,
      roleName: RoleEnum.Admin,
      port: wabe.config.port,
    })

    await userClient.request<any>(gql`
      mutation createTest {
          createTest(input: {fields: {name: "test"}}) {
              test {
                  name
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
                     name
                 }
             }
         }
     }
     `),
    ).resolves.toEqual(expect.anything())

    expect(
      userClient2.request<any>(gql`
     query tests {
         tests {
             edges {
                 node {
                     name
                 }
             }
         }
     }
     `),
    ).rejects.toThrowError('You are not authorized to read this field')
  })

  it("should throw an error if the user doesn't have the right role on update", async () => {
    const { userClient } = await createUserAndUpdateRole({
      anonymousClient,
      rootClient,
      roleName: RoleEnum.Client,
      port: wabe.config.port,
    })

    const { userClient: userClient2 } = await createUserAndUpdateRole({
      anonymousClient,
      rootClient,
      roleName: RoleEnum.Admin,
      port: wabe.config.port,
    })

    const res = await userClient.request<any>(gql`
      mutation createTest {
          createTest(input: {fields: {name: "test"}}) {
              test {
                  id
                  name
              }
          }
      }
      `)

    await userClient.request<any>(gql`
     mutation updateTest {
         updateTest(input: {id: "${res.createTest.test.id}", fields: {name: "test2"}}) {
             test {
                 id
             }
         }
     }
     `)

    expect(
      userClient2.request<any>(gql`
          mutation updateTest {
              updateTest(input: {id: "${res.createTest.test.id}", fields: {name: "test2"}}) {
                  test {
                      name
                  }
              }
          }
     `),
    ).rejects.toThrowError('You are not authorized to update this field')
  })

  it('should throw an error no one have the right role on read', async () => {
    const { userClient } = await createUserAndUpdateRole({
      anonymousClient,
      rootClient,
      roleName: RoleEnum.Client,
      port: wabe.config.port,
    })

    const { userClient: userClient2 } = await createUserAndUpdateRole({
      anonymousClient,
      rootClient,
      roleName: RoleEnum.Admin,
      port: wabe.config.port,
    })

    await userClient.request<any>(gql`
      mutation createTest {
          createTest(input: {fields: {noOne: "test"}}) {
              test {
                  id
                  name
              }
          }
      }
      `)

    expect(
      rootClient.request<any>(gql`
          query tests {
              tests {
                  edges {
                      node {
                          noOne
                      }
                  }
              }
          }
     `),
    ).rejects.toThrowError('You are not authorized to read this field')

    expect(
      userClient.request<any>(gql`
          query tests {
              tests {
                  edges {
                      node {
                          noOne
                      }
                  }
              }
          }
     `),
    ).rejects.toThrowError('You are not authorized to read this field')

    expect(
      userClient2.request<any>(gql`
          query tests {
              tests {
                  edges {
                      node {
                          noOne
                      }
                  }
              }
          }
     `),
    ).rejects.toThrowError('You are not authorized to read this field')
  })

  it('should throw an error no one have the right role on update', async () => {
    const { userClient } = await createUserAndUpdateRole({
      anonymousClient,
      rootClient,
      roleName: RoleEnum.Client,
      port: wabe.config.port,
    })

    const { userClient: userClient2 } = await createUserAndUpdateRole({
      anonymousClient,
      rootClient,
      roleName: RoleEnum.Admin,
      port: wabe.config.port,
    })

    const res = await userClient.request<any>(gql`
      mutation createTest {
          createTest(input: {fields: {noOne: "test"}}) {
              test {
                  id
                  name
              }
          }
      }
      `)

    expect(
      rootClient.request<any>(gql`
     mutation updateTest {
         updateTest(input: {id: "${res.createTest.test.id}", fields: {noOne: "test2"}}) {
             test {
                 id
             }
         }
     }
     `),
    ).rejects.toThrowError('You are not authorized to update this field')

    expect(
      userClient.request<any>(gql`
     mutation updateTest {
         updateTest(input: {id: "${res.createTest.test.id}", fields: {noOne: "test2"}}) {
             test {
                 id
             }
         }
     }
     `),
    ).rejects.toThrowError('You are not authorized to update this field')

    expect(
      userClient2.request<any>(gql`
          mutation updateTest {
              updateTest(input: {id: "${res.createTest.test.id}", fields: {name: "test2"}}) {
                  test {
                      name
                  }
              }
          }
     `),
    ).rejects.toThrowError('You are not authorized to update this field')
  })

  it('should allow only root to read a field protected by rootOnly', async () => {
    const { userClient } = await createUserAndUpdateRole({
      anonymousClient,
      rootClient,
      roleName: RoleEnum.Client,
      port: wabe.config.port,
    })

    const { userClient: userClient2 } = await createUserAndUpdateRole({
      anonymousClient,
      rootClient,
      roleName: RoleEnum.Admin,
      port: wabe.config.port,
    })

    await rootClient.request<any>(gql`
      mutation createTest {
          createTest(input: {fields: {name: "test"}}) {
              test {
                  id
              }
          }
      }
    `)

    expect(
      rootClient.request<any>(gql`
        query tests {
            tests {
                edges {
                    node {
                        rootOnly
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
                        rootOnly
                    }
                }
            }
        }
      `),
    ).rejects.toThrow('You are not authorized to read this field')

    expect(
      userClient2.request<any>(gql`
        query tests {
            tests {
                edges {
                    node {
                        rootOnly
                    }
                }
            }
        }
      `),
    ).rejects.toThrowError('You are not authorized to read this field')
  })

  it('should allow only root to update a field protected by rootOnly', async () => {
    const { userClient } = await createUserAndUpdateRole({
      anonymousClient,
      rootClient,
      roleName: RoleEnum.Client,
      port: wabe.config.port,
    })

    const { userClient: userClient2 } = await createUserAndUpdateRole({
      anonymousClient,
      rootClient,
      roleName: RoleEnum.Admin,
      port: wabe.config.port,
    })

    const res = await rootClient.request<any>(gql`
      mutation createTest {
          createTest(input: {fields: {name: "test"}}) {
              test {
                  id
              }
          }
      }
    `)

    // Root client should be able to update
    expect(
      rootClient.request<any>(gql`
        mutation updateTest {
            updateTest(input: {id: "${res.createTest.test.id}", fields: {rootOnly: "updatedTest"}}) {
                test {
                    rootOnly
                }
            }
        }
      `),
    ).resolves.toEqual(expect.anything())

    // User clients should not be able to update
    expect(
      userClient.request<any>(gql`
        mutation updateTest {
            updateTest(input: {id: "${res.createTest.test.id}", fields: {rootOnly: "updatedTest"}}) {
                test {
                    rootOnly
                }
            }
        }
      `),
    ).rejects.toThrowError('You are not authorized to update this field')

    expect(
      userClient2.request<any>(gql`
        mutation updateTest {
            updateTest(input: {id: "${res.createTest.test.id}", fields: {rootOnly: "updatedTest"}}) {
                test {
                    rootOnly
                }
            }
        }
      `),
    ).rejects.toThrowError('You are not authorized to update this field')
  })
})
