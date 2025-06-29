import { beforeAll, describe, expect, it } from 'bun:test'
import getPort from 'get-port'
import { GraphQLObjectType, GraphQLSchema } from 'graphql'
import { gql } from 'graphql-request'
import { v4 as uuid } from 'uuid'
import { Schema, type SchemaInterface } from '../schema'
import { Wabe } from '../server'
import {
  type DevWabeTypes,
  getAnonymousClient,
  getGraphqlClient,
} from '../utils/helper'
import { GraphQLSchema as WabeGraphQLSchema } from './GraphQLSchema'
import { getTypeFromGraphQLSchema } from './parseGraphqlSchema'
import { getDatabaseAdapter } from '../utils/testHelper'

const createWabe = async (schema: SchemaInterface<DevWabeTypes>) => {
  const databaseId = uuid()

  const port = await getPort()

  const wabe = new Wabe({
    isProduction: false,
    port,
    schema,
    rootKey:
      '0uwFvUxM$ceFuF1aEtTtZMa7DUN2NZudqgY5ve5W*QCyb58cwMj9JeoaV@d#%29v&aJzswuudVU1%nAT+rxS0Bh&OkgBYc0PH18*',
    database: {
      // @ts-expect-error
      adapter: await getDatabaseAdapter(databaseId),
    },
  })

  await wabe.start()

  const client = getGraphqlClient(port)

  return { client, wabe, port }
}

describe('GraphqlSchema', () => {
  let schema: GraphQLSchema

  beforeAll(() => {
    const wabeSchema = new Schema({
      schema: {
        classes: [
          {
            name: 'TestClass2',
            fields: {
              field1: {
                type: 'Object',
                required: true,
                object: {
                  name: 'TestObject',
                  fields: {
                    testSubObject: {
                      type: 'Array',
                      typeValue: 'Object',
                      required: true,
                      object: {
                        name: 'FieldsObject',
                        required: true,
                        fields: {
                          name: {
                            type: 'String',
                            required: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          {
            name: 'TestClass',
            fields: { field1: { type: 'String' } },
          },
          {
            name: 'SecondClass',
            fields: {
              pointer: { type: 'Pointer', class: 'TestClass' },
            },
          },
          {
            name: 'ThirdClass',
            fields: {
              pointer: {
                type: 'Pointer',
                class: 'FourthClass',
              },
            },
          },
          {
            name: 'FourthClass',
            fields: {
              pointer: {
                type: 'Pointer',
                class: 'ThirdClass',
              },
            },
          },
          {
            name: 'FifthClass',
            fields: {
              relation: {
                type: 'Relation',
                class: 'SixthClass',
              },
            },
          },
          {
            name: 'SixthClass',
            fields: {
              field6: { type: 'String' },
            },
          },
          {
            name: 'TestClassRequired',
            fields: {
              field7: {
                type: 'String',
                required: true,
              },
              field8: {
                type: 'Array',
                required: true,
                requiredValue: true,
                typeValue: 'Int',
              },
              field9: {
                type: 'Array',
                required: true,
                typeValue: 'Object',
                object: {
                  name: 'TestObjectArray',
                  fields: {
                    field10: {
                      type: 'Int',
                      required: true,
                    },
                  },
                },
              },
            },
          },
          {
            name: 'TestClassFile',
            fields: {
              file: {
                type: 'File',
                required: true,
              },
            },
          },
        ],
        resolvers: {
          mutations: {
            customMutation: {
              type: 'Boolean',
              resolve: () => true,
            },
            mutationWithCustomTypes: {
              type: 'Array',
              typeValue: 'Object',
              required: true,
              typeValueRequired: true,
              outputObject: {
                name: 'TestMutation',
                fields: {
                  name: {
                    type: 'String',
                  },
                },
              },
              resolve: () => {
                return [{ name: 'test' }]
              },
            },
          },
          queries: {
            customQuery: {
              type: 'Boolean',
              resolve: () => true,
            },
            queryWithCustomTypes: {
              type: 'Array',
              typeValue: 'Object',
              required: true,
              typeValueRequired: true,
              outputObject: {
                name: 'TestQuery',
                fields: {
                  name: {
                    type: 'String',
                  },
                },
              },
              resolve: () => {
                return [{ name: 'test' }]
              },
            },
          },
        },
      },
    } as any)

    const graphqlSchema = new WabeGraphQLSchema(wabeSchema)

    const types = graphqlSchema.createSchema()

    schema = new GraphQLSchema({
      query: new GraphQLObjectType({
        name: 'Query',
        fields: types.queries,
      }),
      mutation: new GraphQLObjectType({
        name: 'Mutation',
        fields: types.mutations,
      }),
      types: [...types.scalars, ...types.enums, ...types.objects],
    })
  })

  it('should be able to only get ok output on query / mutation that returns connection object', async () => {
    const { wabe, client } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: {
            field1: {
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
      ],
    })

    await client.request(gql`
      mutation deleteTestClasses {
        deleteTestClasses(input: { where: { field1: { equalTo: "field1" } } }) {
          ok
        }
      }
      `)

    await client.request(gql`
      query testsClasses {
        testClasses {
          ok
        }
      }
      `)

    await wabe.close()
  })

  it('should set correctly the where input on array field', async () => {
    const { wabe } = await createWabe({
      classes: [
        {
          name: 'TestClassOnly',
          fields: {
            field1: {
              type: 'Object',
              object: {
                name: 'TestObject',
                required: true,
                fields: {
                  field1: {
                    type: 'Array',
                    typeValue: 'String',
                    required: true,
                    requiredValue: true,
                  },
                },
              },
            },
          },
        },
      ],
    })

    expect(
      getTypeFromGraphQLSchema({
        schema: wabe.config.graphqlSchema || ({} as any),
        type: 'Type',
        name: 'TestClassOnlyTestObjectWhereInput',
      }).input.field1,
    ).toEqual('ArrayWhereInput')

    await wabe.close()
  })

  it('should set correctly the where input on object field', async () => {
    const { wabe } = await createWabe({
      classes: [
        {
          name: 'TestClassOnly',
          fields: {
            field1: {
              type: 'Object',
              object: {
                name: 'TestObject',
                required: true,
                fields: {
                  field1: {
                    type: 'Object',
                    object: {
                      name: 'TestTata',
                      fields: {
                        field2: {
                          type: 'String',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ],
    })

    expect(
      getTypeFromGraphQLSchema({
        schema: wabe.config.graphqlSchema || ({} as any),
        type: 'Type',
        name: 'TestClassOnlyTestObjectWhereInput',
      }).input.field1,
    ).toEqual('TestClassOnlyTestObjectField1WhereInput')

    expect(
      getTypeFromGraphQLSchema({
        schema: wabe.config.graphqlSchema || ({} as any),
        type: 'Type',
        name: 'TestClassOnlyTestObjectField1WhereInput',
      }).input.field2,
    ).toEqual('StringWhereInput')

    await wabe.close()
  })

  it('should request totalCount on relation', async () => {
    const { wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass1',
          fields: {
            field1: {
              type: 'Relation',
              // @ts-expect-error
              class: 'TestClass2',
            },
          },
        },
        {
          name: 'TestClass2',
          fields: {
            field2: {
              type: 'String',
            },
          },
        },
      ],
    })

    const rootClient = getGraphqlClient(wabe.config.port)

    const result1 = await rootClient.request<any>(gql`
			mutation createTestClass1 {
				createTestClass1(input: { fields: { field1: { createAndAdd: [{ field2: "field2" }] } } }) {
					testClass1 {
						id
					}
				}
			}
		`)

    const result2 = await rootClient.request<any>(gql`
      query testClass1 {
          testClass1(id: "${result1.createTestClass1.testClass1.id}") {
            field1 {
              totalCount
            }
          }
      }
      `)

    expect(result2.testClass1.field1.totalCount).toEqual(1)

    await wabe.close()
  })

  it('should request relation object on single object query', async () => {
    const { wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass1',
          fields: {
            field1: {
              type: 'Relation',
              // @ts-expect-error
              class: 'TestClass2',
            },
          },
        },
        {
          name: 'TestClass2',
          fields: {
            field2: {
              type: 'String',
            },
          },
        },
      ],
    })

    const rootClient = getGraphqlClient(wabe.config.port)

    const result1 = await rootClient.request<any>(gql`
			mutation createTestClass1 {
				createTestClass1(input: { fields: { field1: { createAndAdd: [{ field2: "field2" }] } } }) {
					testClass1 {
						id
					}
				}
			}
		`)

    const result2 = await rootClient.request<any>(gql`
      query testClass1 {
          testClass1(id: "${result1.createTestClass1.testClass1.id}") {
            field1 {
            edges {
                node {
                field2
                }
             }
            }
          }
      }
      `)

    expect(result2.testClass1.field1.edges[0].node.field2).toBe('field2')

    await wabe.close()
  })

  it('should have FileInput input on Create and Update fields input when we use a File field', async () => {
    const { wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: {
            file: {
              type: 'File',
              required: true,
            },
          },
        },
      ],
    })

    expect(
      getTypeFromGraphQLSchema({
        schema: wabe.config.graphqlSchema || ({} as any),
        type: 'Type',
        name: 'TestClassCreateFieldsInput',
      }).input.file,
    ).toEqual('FileInput!')

    expect(
      getTypeFromGraphQLSchema({
        schema: wabe.config.graphqlSchema || ({} as any),
        type: 'Type',
        name: 'TestClassUpdateFieldsInput',
      }).input.file,
    ).toEqual('FileInput!')

    await wabe.close()
  })

  it('should have FileInfo object on the wabe object when we use a File field', async () => {
    const { wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: {
            file: {
              type: 'File',
              required: true,
            },
          },
        },
      ],
    })

    expect(
      getTypeFromGraphQLSchema({
        schema: wabe.config.graphqlSchema || ({} as any),
        type: 'Type',
        name: 'TestClass',
      }).input.file,
    ).toEqual('FileInfo!')

    await wabe.close()
  })

  it('should be able to create a phone field that check correctly if the phone is valid across the world', async () => {
    const { client, wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: {
            phone: {
              type: 'Phone',
            },
          },
        },
      ],
    })

    // French mobile valid
    await client.request<any>(gql`
			mutation createTestClass {
				createTestClass(input: { fields: { phone: "+33612345678" } }) {
					testClass {
						phone
					}
				}
			}
		`)

    // USA californian valid
    await client.request<any>(gql`
			mutation createTestClass {
				createTestClass(input: { fields: { phone: "+14155552671" } }) {
					testClass {
						phone
					}
				}
			}
		`)

    // Brasil mobile valid
    await client.request<any>(gql`
			mutation createTestClass {
				createTestClass(input: { fields: { phone: "+5511998765432" } }) {
					testClass {
						phone
					}
				}
			}
		`)

    // French mobile not valid
    expect(
      client.request<any>(gql`
			mutation createTestClass {
				createTestClass(input: { fields: { phone: "+3361234578" } }) {
					testClass {
						phone
					}
				}
			}
		`),
    ).rejects.toThrow('Expected value of type "Phone", found "+3361234578"')

    // USA californian not valid
    expect(
      client.request<any>(gql`
    	mutation createTestClass {
    		createTestClass(input: { fields: { phone: "+1415555267" } }) {
    			testClass {
    				phone
    			}
    		}
    	}
    `),
    ).rejects.toThrow('Expected value of type "Phone", found "+1415555267"')

    // Brasil mobile not valid
    expect(
      client.request<any>(gql`
    	mutation createTestClass {
    		createTestClass(input: { fields: { phone: "+5511234567" } }) {
    			testClass {
    				phone
    			}
    		}
    	}
    `),
    ).rejects.toThrow('Expected value of type "Phone", found "+5511234567"')

    await wabe.close()
  })

  it('should be able to create an array in an object', async () => {
    const { wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: {
            field1: {
              type: 'Array',
              typeValue: 'Object',
              object: {
                name: 'SubObject',
                fields: {
                  field2: {
                    type: 'Array',
                    typeValue: 'String',
                    required: true,
                    requiredValue: false,
                  },
                  field3: { type: 'Int' },
                },
              },
            },
          },
        },
      ],
    })

    expect(
      getTypeFromGraphQLSchema({
        schema: wabe.config.graphqlSchema || ({} as any),
        type: 'Type',
        name: 'TestClassSubObject',
      }).input,
    ).toEqual({
      field2: '[String]!',
      field3: 'Int',
    })

    await wabe.close()
  })

  // It is useful when we have the permission to create but not to read the data
  // We should be able to create a new object without return any data
  // Just use the "ok" field
  it('should be able to create a new object with mutation without return any data', async () => {
    const { wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: {
            name: {
              type: 'String',
            },
          },
          permissions: {
            // Anyone can create a new object
            create: {
              requireAuthentication: false,
            },
            // No one can read the data
            read: {
              authorizedRoles: [],
              requireAuthentication: true,
            },
          },
        },
      ],
    })

    const anonymousClient = getAnonymousClient(wabe.config.port)

    const res = await anonymousClient.request<any>(
      gql`
          mutation createTestClass {
            createTestClass(
              input: {
                fields: { name: "A" },
              }
            ) {
              ok
            }
          }
        `,
      {},
    )

    expect(res.createTestClass.ok).toBe(true)

    await wabe.close()
  })

  it('should be able to update an object with mutation without return any data', async () => {
    const { client, wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: {
            name: {
              type: 'String',
            },
          },
          permissions: {
            // Anyone can create a new object
            create: {
              requireAuthentication: false,
            },
            update: {
              requireAuthentication: false,
            },
            // No one can read the data
            read: {
              authorizedRoles: [],
              requireAuthentication: true,
            },
          },
        },
      ],
    })

    const res = await client.request<any>(
      gql`
          mutation createTestClass {
            createTestClass(
              input: {
                fields: { name: "A" },
              }
            ) {
              testClass{
                  id
              }
            }
          }
        `,
      {},
    )

    const anonymousClient = getAnonymousClient(wabe.config.port)

    const res2 = await anonymousClient.request<any>(
      gql`
          mutation updateTestClass {
              updateTestClass(
              input: {
                fields: { name: "A" },
                id: "${res.createTestClass.testClass.id}"
              }
            ) {
              ok
            }
          }
        `,
      {},
    )

    expect(res2.updateTestClass.ok).toBe(true)

    await wabe.close()
  })

  it('should be able to delete an object with mutation without return any data', async () => {
    const { client, wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: {
            name: {
              type: 'String',
            },
          },
          permissions: {
            create: {
              requireAuthentication: false,
            },
            delete: {
              requireAuthentication: false,
            },
          },
        },
      ],
    })

    const res = await client.request<any>(
      gql`
          mutation createTestClass {
            createTestClass(
              input: {
                fields: { name: "A" },
              }
            ) {
              testClass{
                  id
              }
            }
          }
        `,
      {},
    )

    const anonymousClient = getAnonymousClient(wabe.config.port)

    const res2 = await anonymousClient.request<any>(
      gql`
          mutation deleteTestClass {
              deleteTestClass(
              input: {
                id: "${res.createTestClass.testClass.id}"
              }
            ) {
              ok
            }
          }
        `,
      {},
    )

    expect(res2.deleteTestClass.ok).toBe(true)

    await wabe.close()
  })

  it('should order the element in the query by name and age ASC using order enum', async () => {
    const { client, wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: {
            name: {
              type: 'String',
            },
            age: {
              type: 'Int',
            },
          },
        },
      ],
    })

    await client.request<any>(
      gql`
          mutation createTestClasses {
            createTestClasses(
              input: {
                fields: [
                  { name: "A", age: 20 },
                  { name: "B", age: 19 },
                  { name: "C", age: 18 },
                  { name: "D", age: 17 },
                ]
              }
            ) {
              edges {
                node {
                  name
                }
              }
            }
          }
        `,
      {},
    )

    const res = await client.request<any>(
      gql`
          query testClasses {
            testClasses(
              order: [name_DESC, age_ASC]
            ) {
              edges {
                node {
                  name
                }
              }
            }
          }
        `,
      {},
    )

    expect(res.testClasses.edges[0].node.name).toBe('D')
    expect(res.testClasses.edges[1].node.name).toBe('C')
    expect(res.testClasses.edges[2].node.name).toBe('B')
    expect(res.testClasses.edges[3].node.name).toBe('A')

    await wabe.close()
  })

  it('should order the element in the query by name ASC using order enum', async () => {
    const { client, wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: {
            name: {
              type: 'String',
            },
          },
        },
      ],
    })

    await client.request<any>(
      gql`
          mutation createTestClasses {
            createTestClasses(
              input: {
                fields: [
                  { name: "test1" },
                  { name: "test2" },
                  { name: "test3" },
                  { name: "test4" },
                ]
              }
            ) {
              edges {
                node {
                  name
                }
              }
            }
          }
        `,
      {},
    )

    const res = await client.request<any>(
      gql`
          query testClasses {
            testClasses(
              where: { name: { equalTo: "test1" } }
              order: [name_ASC]
            ) {
              edges {
                node {
                  name
                }
              }
            }
          }
        `,
      {},
    )

    expect(res.testClasses.edges[0].node.name).toBe('test1')

    await wabe.close()
  })

  it('should use the searchUsers to search all testClasses for corresponding term', async () => {
    const { client, wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: {
            name: {
              type: 'String',
            },
            age: {
              type: 'Int',
            },
          },
          searchableFields: ['name'],
        },
      ],
    })

    await client.request<any>(
      gql`
				mutation createTestClass {
					createTestClass(
						input: { fields: { name: "test", age: 30 } }
					) {
						testClass {
							name
						}
					}
				}
			`,
      {},
    )

    const res = await client.request<any>(
      gql`
    	query testClasses {
    		testClasses(
    			where: {
    				AND: [
    					{ age: { equalTo: 30 } }
    					{ search: { contains: "t" } }
    				]
    			}
    		) {
    			totalCount
    		}
    	}
    `,
    )

    expect(res.testClasses.totalCount).toEqual(1)

    const res2 = await client.request<any>(
      gql`
    	query testClasses {
    		testClasses(where: { search: { contains: "invalid" } }) {
    			totalCount
    		}
    	}
    `,
    )

    expect(res2.testClasses.totalCount).toEqual(0)

    const res3 = await client.request<any>(
      gql`
    	query testClasses {
    		testClasses(where: { search: { contains: "test" } }) {
    			totalCount
    		}
    	}
    `,
    )

    expect(res3.testClasses.totalCount).toEqual(1)

    const res4 = await client.request<any>(
      gql`
    	query testClasses {
    		testClasses(
    			where: {
    				AND: [
    					{ age: { equalTo: 1111 } }
    					{ search: { contains: "test" } }
    				]
    			}
    		) {
    			totalCount
    		}
    	}
    `,
    )

    expect(res4.testClasses.totalCount).toEqual(0)

    const res5 = await client.request<any>(
      gql`
    	query testClasses {
    		testClasses(
    			where: {
    				AND: [
    					{ age: { equalTo: 30 } }
    					{ search: { contains: "" } }
    				]
    			}
    		) {
    			totalCount
    		}
    	}
    `,
    )

    expect(res5.testClasses.totalCount).toEqual(1)

    await wabe.close()
  })

  it('should contain totalCount elements in query multiple objects', () => {
    expect(
      getTypeFromGraphQLSchema({
        schema,
        type: 'Type',
        name: 'TestClassConnection',
      }).input.totalCount,
    ).toEqual('Int')
  })

  it('should totalCount all elements corresponding to where object', async () => {
    const { client, wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: {
            field1: {
              type: 'Object',
              object: {
                name: 'SubObject',
                fields: {
                  field2: { type: 'String' },
                  field3: { type: 'Int' },
                },
              },
            },
          },
        },
      ],
    })

    await client.request<any>(
      gql`
				mutation createTestClass {
					createTestClass(
						input: {
							fields: { field1: { field2: "test", field3: 1 } }
						}
					) {
						testClass {
							field1 {
								field2
							}
						}
					}
				}
			`,
      {},
    )

    const res = await client.request<any>(
      gql`
				query testClasses {
					testClasses {
						totalCount
					}
				}
			`,
    )

    expect(res.testClasses.totalCount).toEqual(1)

    await wabe.close()
  })

  it('should request an object with pointer in same class (issue #5)', async () => {
    const { client, wabe } = await createWabe({
      classes: [],
    })

    await client.request<any>(gql`
			mutation createOnboarding {
				createUser(
					input: {
						fields: {
							authentication: {
								emailPassword: {
									email: "test@gmail.com"
									password: "password"
								}
							}
						}
					}
				) {
					user {
						email
					}
				}
			}
		`)

    const res = await client.request<any>(gql`
			query users {
				users {
					edges {
						node {
							authentication {
								emailPassword {
									email
									password
								}
							}
						}
					}
				}
			}
		`)

    expect(res.users.edges[0].node.authentication.emailPassword).toEqual({
      email: 'test@gmail.com',
      password: expect.any(String),
    })

    await wabe.close()
  })

  it('should support custom output types for queries and mutations', () => {
    expect(
      getTypeFromGraphQLSchema({
        schema,
        type: 'Query',
        name: 'queryWithCustomTypes',
      }).output,
    ).toEqual('[TestQuery!]!')

    expect(
      getTypeFromGraphQLSchema({
        schema,
        type: 'Mutation',
        name: 'mutationWithCustomTypes',
      }).output,
    ).toEqual('[TestMutation!]!')
  })

  it('should have required field on object fields', () => {
    expect(
      getTypeFromGraphQLSchema({
        schema,
        type: 'Type',
        name: 'TestClassRequired',
      }).input.field7,
    ).toEqual('String!')

    expect(
      getTypeFromGraphQLSchema({
        schema,
        type: 'Type',
        name: 'TestClassRequired',
      }).input.field8,
    ).toEqual('[Int!]!')

    expect(
      getTypeFromGraphQLSchema({
        schema,
        type: 'Type',
        name: 'TestClassRequired',
      }).input.field9,
    ).toEqual('[TestClassRequiredTestObjectArray]!')
  })

  it('should support object of array of object', () => {
    expect(
      getTypeFromGraphQLSchema({
        schema,
        type: 'Type',
        name: 'TestClass2',
      }).input.field1,
    ).toEqual('TestClass2TestObject!')

    expect(
      getTypeFromGraphQLSchema({
        schema,
        type: 'Type',
        name: 'TestClass2TestObject',
      }).input.testSubObject,
    ).toEqual('[TestClass2TestObjectFieldsObject!]!')

    expect(
      getTypeFromGraphQLSchema({
        schema,
        type: 'Type',
        name: 'TestClass2TestObjectFieldsObject',
      }).input,
    ).toEqual({ name: 'String!' })
  })

  it('should support an array of object in graphql schema', async () => {
    const { client, wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: {
            field1: {
              type: 'Array',
              typeValue: 'Object',
              object: {
                name: 'Field1Object',
                fields: {
                  name: {
                    type: 'String',
                  },
                },
              },
            },
          },
        },
      ],
    })

    const res = await client.request<any>(gql`
			mutation createTestClass {
				createTestClass(
					input: {
						fields: {
							field1: [{ name: "test" }, { name: "test2" }]
						}
					}
				) {
					testClass {
						id
						field1 {
							name
						}
					}
				}
			}
		`)

    expect(res.createTestClass.testClass.field1).toEqual([
      { name: 'test' },
      { name: 'test2' },
    ])

    await wabe.close()
  })

  it('should return an array in a query', async () => {
    const { client, wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: {
            field1: {
              type: 'String',
            },
          },
        },
      ],
      resolvers: {
        queries: {
          testQuery: {
            resolve: () => {
              return ['test']
            },
            type: 'Array',
            typeValue: 'String',
          },
        },
      },
    })

    const res = await client.request<any>(gql`
			query testQuery {
				testQuery
			}
		`)

    expect(res.testQuery).toEqual(['test'])

    await wabe.close()
  })

  it('should return an object in a query', async () => {
    const { client, wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: {
            field1: {
              type: 'String',
            },
          },
        },
      ],
      resolvers: {
        queries: {
          testQuery: {
            resolve: () => {
              return { test: 'test' }
            },
            type: 'Object',
            outputObject: {
              name: 'TestQueryOutput',
              fields: {
                test: {
                  type: 'String',
                },
              },
            },
          },
        },
      },
    })

    const res = await client.request<any>(gql`
			query testQuery {
				testQuery {
					test
				}
			}
		`)

    expect(res.testQuery.test).toEqual('test')

    await wabe.close()
  })

  it('should return an array in a mutation', async () => {
    const { client, wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: {
            field1: {
              type: 'String',
            },
          },
        },
      ],
      resolvers: {
        mutations: {
          testMutation: {
            resolve: () => {
              return ['test']
            },
            type: 'Array',
            typeValue: 'String',
          },
        },
      },
    })

    const res = await client.request<any>(gql`
			mutation testMutation {
				testMutation
			}
		`)

    expect(res.testMutation).toEqual(['test'])

    await wabe.close()
  })

  it('should return an object in a mutation', async () => {
    const { client, wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: {
            field1: {
              type: 'String',
            },
          },
        },
      ],
      resolvers: {
        mutations: {
          testMutation: {
            resolve: () => {
              return { test: 'test' }
            },
            type: 'Object',
            outputObject: {
              name: 'TestMutationOutput',
              fields: {
                test: {
                  type: 'String',
                },
              },
            },
          },
        },
      },
    })

    const res = await client.request<any>(gql`
			mutation testMutation {
				testMutation {
					test
				}
			}
		`)

    expect(res.testMutation.test).toEqual('test')

    await wabe.close()
  })

  it('should have a custom enum as value in type', async () => {
    const { client, wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: {
            field1: {
              // @ts-expect-error
              type: 'CustomEnum',
            },
          },
        },
      ],
      enums: [
        {
          name: 'CustomEnum',
          values: {
            Value1: 'Value1',
            Value2: 'Value2',
          },
        },
      ],
    })

    await client.request<any>(gql`
			mutation createTestClass {
				createTestClass(input: { fields: { field1: Value1 } }) {
					testClass {
						field1
					}
				}
			}
		`)

    const res = await client.request<any>(gql`
			query testClasses {
				testClasses(where: { field1: { equalTo: "Value1" } }) {
					edges {
						node {
							id
							field1
						}
					}
				}
			}
		`)

    expect(res.testClasses.edges.length).toBe(1)
    expect(res.testClasses.edges[0].node.field1).toBe('Value1')

    const resNotEqual = await client.request<any>(gql`
			query testClasses {
				testClasses(where: { field1: { notEqualTo: "Value1" } }) {
					edges {
						node {
							id
							field1
						}
					}
				}
			}
		`)

    expect(resNotEqual.testClasses.edges.length).toBe(0)

    await wabe.close()
  })

  it('should have correct WhereInput object', () => {
    expect(
      getTypeFromGraphQLSchema({
        schema,
        type: 'Type',
        name: 'TestClassWhereInput',
      }).input,
    ).toEqual({
      id: 'IdWhereInput',
      AND: '[TestClassWhereInput]',
      OR: '[TestClassWhereInput]',
      field1: 'StringWhereInput',
      acl: 'TestClassACLObjectWhereInput',
      createdAt: 'DateWhereInput',
      updatedAt: 'DateWhereInput',
      search: 'SearchWhereInput',
    })
  })

  it('should have ConnectionObject on field of relation in ObjectType', () => {
    expect(
      getTypeFromGraphQLSchema({
        schema,
        type: 'Type',
        name: 'FifthClass',
      }).input.relation,
    ).toEqual('SixthClassConnection')
  })

  it('should have a TestClassRelationInput', () => {
    expect(
      getTypeFromGraphQLSchema({
        schema,
        type: 'Type',
        name: 'TestClassRelationInput',
      }).input.createAndAdd,
    ).toEqual('[TestClassCreateFieldsInput!]')
  })

  it('should have a RelationInput on SixthClass on field relation of FifthClass', () => {
    expect(
      getTypeFromGraphQLSchema({
        schema,
        type: 'Type',
        name: 'FifthClassInput',
      }).input.relation,
    ).toEqual('SixthClassRelationInput')
  })

  it('should have the pointer in the object when there is a circular dependency in pointer', () => {
    expect(
      getTypeFromGraphQLSchema({
        schema,
        type: 'Type',
        name: 'ThirdClass',
      }).input.pointer,
    ).toEqual('FourthClass')

    expect(
      getTypeFromGraphQLSchema({
        schema,
        type: 'Type',
        name: 'FourthClass',
      }).input.pointer,
    ).toEqual('ThirdClass')

    expect(
      getTypeFromGraphQLSchema({
        schema,
        type: 'Type',
        name: 'ThirdClassInput',
      }).input.pointer,
    ).toEqual('FourthClassPointerInput')

    expect(
      getTypeFromGraphQLSchema({
        schema,
        type: 'Type',
        name: 'FourthClassInput',
      }).input.pointer,
    ).toEqual('ThirdClassPointerInput')

    expect(
      getTypeFromGraphQLSchema({
        schema,
        type: 'Type',
        name: 'ThirdClassPointerInput',
      }).input.createAndLink,
    ).toEqual('ThirdClassCreateFieldsInput')

    expect(
      getTypeFromGraphQLSchema({
        schema,
        type: 'Type',
        name: 'FourthClassPointerInput',
      }).input.createAndLink,
    ).toEqual('FourthClassCreateFieldsInput')
  })

  it('should have TestClassPointerInput', () => {
    expect(
      getTypeFromGraphQLSchema({
        schema,
        type: 'Type',
        name: 'TestClassPointerInput',
      }).input.createAndLink,
    ).toEqual('TestClassCreateFieldsInput')
  })

  it('should have a type with a pointer to TestClass', () => {
    expect(
      getTypeFromGraphQLSchema({
        schema,
        type: 'Type',
        name: 'SecondClass',
      }).input.pointer,
    ).toEqual('TestClass')
  })

  it('should have pointer input on SecondClassCreateFieldsInput', () => {
    expect(
      getTypeFromGraphQLSchema({
        schema,
        type: 'Type',
        name: 'SecondClassCreateFieldsInput',
      }).input.pointer,
    ).toEqual('TestClassPointerInput')
  })

  it('should have pointer input on SecondClassUpdateFieldsInput', () => {
    expect(
      getTypeFromGraphQLSchema({
        schema,
        type: 'Type',
        name: 'SecondClassUpdateFieldsInput',
      }).input.pointer,
    ).toEqual('TestClassPointerInput')
  })

  it('should have ClassCreateInputFieldsInput', () => {
    expect(
      getTypeFromGraphQLSchema({
        schema,
        type: 'Type',
        name: 'TestClassCreateFieldsInput',
      }).input.field1,
    ).toEqual('String')
  })

  it('should have ClassUpdateInputFieldsInput', () => {
    expect(
      getTypeFromGraphQLSchema({
        schema,
        type: 'Type',
        name: 'TestClassUpdateFieldsInput',
      }).input.field1,
    ).toEqual('String')
  })

  it('should get correct CreateTestClassPaylod type', () => {
    expect(
      getTypeFromGraphQLSchema({
        schema,
        type: 'Type',
        name: 'CreateTestClassPayload',
      }).input,
    ).toEqual({
      ok: 'Boolean',
      testClass: 'TestClass',
    })
  })

  it('should return graphql relay standard output for default get query', () => {
    expect(
      getTypeFromGraphQLSchema({
        schema,
        type: 'Query',
        name: 'testClass',
      }),
    ).toEqual({
      input: {
        id: 'ID',
      },
      output: 'TestClass',
    })
  })

  it('should return graphql relay standard output for default get query (multiple)', () => {
    expect(
      getTypeFromGraphQLSchema({
        schema,
        type: 'Query',
        name: 'testClasses',
      }),
    ).toEqual({
      input: {
        first: 'Int',
        offset: 'Int',
        where: 'TestClassWhereInput',
        order: '[TestClassOrder!]',
      },
      output: 'TestClassConnection!',
    })
  })

  it('should return graphql relay standard output for default create mutation', () => {
    expect(
      getTypeFromGraphQLSchema({
        schema,
        type: 'Mutation',
        name: 'createTestClass',
      }),
    ).toEqual({
      input: { input: 'CreateTestClassInput!' },
      output: 'CreateTestClassPayload',
    })
  })

  it('should return graphql relay standard output for default creates mutation (multiple)', () => {
    expect(
      getTypeFromGraphQLSchema({
        schema,
        type: 'Mutation',
        name: 'createTestClasses',
      }),
    ).toEqual({
      input: { input: 'CreateTestClassesInput!' },
      output: 'TestClassConnection!',
    })
  })

  it('should return graphql relay standard output for default update mutation (clientMutationId, type)', () => {
    expect(
      getTypeFromGraphQLSchema({
        schema,
        type: 'Mutation',
        name: 'updateTestClass',
      }),
    ).toEqual({
      input: { input: 'UpdateTestClassInput!' },
      output: 'UpdateTestClassPayload',
    })
  })

  it('should return graphql relay standard output for default updates (multiple) mutation', () => {
    expect(
      getTypeFromGraphQLSchema({
        schema,
        type: 'Mutation',
        name: 'updateTestClasses',
      }),
    ).toEqual({
      input: { input: 'UpdateTestClassesInput!' },
      output: 'TestClassConnection!',
    })
  })

  it('should return graphql relay standard output for default delete mutation (clientMutationId, type)', () => {
    expect(
      getTypeFromGraphQLSchema({
        schema,
        type: 'Mutation',
        name: 'deleteTestClass',
      }),
    ).toEqual({
      input: { input: 'DeleteTestClassInput!' },
      output: 'DeleteTestClassPayload',
    })
  })

  it('should return graphql relay standard output for default deletes (multiple) mutation', () => {
    expect(
      getTypeFromGraphQLSchema({
        schema,
        type: 'Mutation',
        name: 'deleteTestClasses',
      }),
    ).toEqual({
      input: { input: 'DeleteTestClassesInput!' },
      output: 'TestClassConnection!',
    })
  })

  it('should not create input for mutation when there is no field', () => {
    expect(
      getTypeFromGraphQLSchema({
        schema,
        type: 'Mutation',
        name: 'customMutation',
      }),
    ).toEqual({
      input: {},
      output: 'Boolean',
    })
  })

  it('should create custom query with no args', () => {
    expect(
      getTypeFromGraphQLSchema({
        schema,
        type: 'Query',
        name: 'customQuery',
      }),
    ).toEqual({
      input: {},
      output: 'Boolean',
    })
  })

  it('should create mutation with sub input', async () => {
    const { client, wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: { field1: { type: 'String' } },
        },
      ],
      resolvers: {
        mutations: {
          customMutation: {
            type: 'Int',
            args: {
              input: {
                sum: {
                  type: 'Object',
                  object: {
                    name: 'Sum',
                    fields: {
                      a: {
                        type: 'Int',
                        required: true,
                      },
                      b: {
                        type: 'Int',
                        required: true,
                      },
                    },
                  },
                },
              },
            },
            resolve: (_: any, args: any) => args.input.sum.a + args.input.sum.b,
          },
        },
      },
    })

    const request = await client.request<any>(
      gql`
				mutation customMutation {
					customMutation(input: { sum: { a: 1, b: 2 } })
				}
			`,
      {},
    )

    expect(request.customMutation).toBe(3)

    await wabe.close()
  })

  it('should create mutation with sub sub input', async () => {
    const { client, wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: { field1: { type: 'String' } },
        },
      ],
      resolvers: {
        mutations: {
          customMutation: {
            type: 'Int',
            args: {
              input: {
                subObject: {
                  type: 'Object',
                  object: {
                    name: 'SubObject',
                    fields: {
                      sum: {
                        type: 'Object',
                        object: {
                          name: 'Sum',
                          fields: {
                            a: {
                              type: 'Int',
                              required: true,
                            },
                            b: {
                              type: 'Int',
                              required: true,
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
            resolve: (_: any, args: any) =>
              args.input.subObject.sum.a + args.input.subObject.sum.b,
          },
        },
      },
    })

    const request = await client.request<any>(
      gql`
				mutation customMutation {
					customMutation(
						input: { subObject: { sum: { a: 1, b: 2 } } }
					)
				}
			`,
      {},
    )

    expect(request.customMutation).toBe(3)

    await wabe.close()
  })

  it('should create custom mutation with sub object and correct input name', async () => {
    const { client, wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: { field1: { type: 'String' } },
        },
      ],
      resolvers: {
        mutations: {
          customMutation: {
            type: 'Int',
            args: {
              input: {
                sum: {
                  type: 'Object',
                  object: {
                    name: 'Sum',
                    fields: {
                      a: {
                        type: 'Int',
                        required: true,
                      },
                      b: {
                        type: 'Int',
                        required: true,
                      },
                    },
                  },
                },
              },
            },
            resolve: (_: any, args: any) => args.input.sum.a + args.input.sum.b,
          },
        },
      },
    })

    const request = await client.request<any>(
      gql`
				mutation customMutation($sum: CustomMutationSumInput!) {
					customMutation(input: { sum: $sum })
				}
			`,
      {
        sum: {
          a: 1,
          b: 2,
        },
      },
    )

    expect(request.customMutation).toBe(3)

    const request2 = await client.request<any>(
      gql`
				mutation customMutation($input: CustomMutationInput!) {
					customMutation(input: $input)
				}
			`,
      {
        input: {
          sum: {
            a: 1,
            b: 2,
          },
        },
      },
    )

    expect(request2.customMutation).toBe(3)

    await wabe.close()
  })

  it('should create a sub object with the good type', async () => {
    const { client, wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: {
            field1: {
              type: 'Object',
              object: {
                name: 'SubObject',
                fields: {
                  field2: { type: 'String' },
                  field3: { type: 'Int' },
                },
              },
            },
          },
        },
      ],
    })

    await client.request<any>(
      gql`
				mutation createTestClass {
					createTestClass(
						input: {
							fields: { field1: { field2: "test", field3: 1 } }
						}
					) {
						testClass {
							field1 {
								field2
							}
						}
					}
				}
			`,
      {},
    )

    const request = await client.request<any>(
      gql`
				query testClasses(
					$field1WhereInput: TestClassSubObjectWhereInput
				) {
					testClasses(where: { field1: $field1WhereInput }) {
						edges {
							node {
								field1 {
									field2
									field3
								}
							}
						}
					}
				}
			`,
      {
        field1WhereInput: {
          field2: { equalTo: 'test' },
        },
      },
    )

    expect(request.testClasses.edges[0].node.field1.field2).toBe('test')
    expect(request.testClasses.edges[0].node.field1.field3).toBe(1)

    await wabe.close()
  })

  it('should create an object with a pointer (createAndLink)', async () => {
    const { client, wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: {
            field1: {
              type: 'String',
            },
          },
        },
        {
          name: 'TestClass2',
          fields: {
            name: {
              type: 'String',
            },
            field2: {
              type: 'Pointer',
              // @ts-expect-error
              class: 'TestClass',
            },
          },
        },
      ],
    })

    const res = await client.request<any>(
      gql`
				mutation createTestClass {
					createTestClass2(
						input: {
							fields: {
								name: "name"
								field2: { createAndLink: { field1: "field1" } }
							}
						}
					) {
						testClass2 {
							name
							field2 {
								field1
							}
						}
					}
				}
			`,
      {},
    )

    expect(res.createTestClass2.testClass2.name).toBe('name')
    expect(res.createTestClass2.testClass2.field2.field1).toBe('field1')

    await wabe.close()
  })

  it('should link an object to a pointer', async () => {
    const { client, wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: {
            field1: {
              type: 'String',
            },
          },
        },
        {
          name: 'TestClass2',
          fields: {
            name: {
              type: 'String',
            },
            field2: {
              type: 'Pointer',
              // @ts-expect-error
              class: 'TestClass',
            },
          },
        },
      ],
    })

    const {
      createTestClass: {
        testClass: { id: idOfTestClass },
      },
    } = await client.request<any>(
      gql`
				mutation createTestClass {
					createTestClass(input: { fields: { field1: "field1" } }) {
						testClass {
							id
						}
					}
				}
			`,
      {},
    )

    const res = await client.request<any>(
      gql`
					mutation createTestClass {
						createTestClass2(
							input: {
								fields: {
									name: "name"
									field2: {
										link: "${idOfTestClass}"
									}
								}
							}
						) {
							testClass2 {
								name
								field2 {
									field1
								}
							}
						}
					}
				`,
      {},
    )

    expect(res.createTestClass2.testClass2.name).toBe('name')
    expect(res.createTestClass2.testClass2.field2.field1).toBe('field1')

    await wabe.close()
  })

  it('should link a pointer on create multiple object', async () => {
    const { client, wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: {
            field1: {
              type: 'String',
            },
          },
        },
        {
          name: 'TestClass2',
          fields: {
            name: {
              type: 'String',
            },
            field2: {
              type: 'Pointer',
              // @ts-expect-error
              class: 'TestClass',
            },
          },
        },
      ],
    })

    const res = await client.request<any>(
      gql`
				mutation createTestClass2s {
					createTestClass2s(
						input: {
							fields: [
								{
									name: "name"
									field2: {
										createAndLink: { field1: "field1" }
									}
								}
							]
						}
					) {
						edges {
							node {
								name
								field2 {
									field1
								}
							}
						}
					}
				}
			`,
      {},
    )

    expect(res.createTestClass2s.edges[0].node.name).toBe('name')
    expect(res.createTestClass2s.edges[0].node.field2.field1).toBe('field1')

    await wabe.close()
  })

  it('should filter an object (on query) with pointer field', async () => {
    const { client, wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: {
            field1: {
              type: 'String',
            },
          },
        },
        {
          name: 'TestClass2',
          fields: {
            name: {
              type: 'String',
            },
            field2: {
              type: 'Pointer',
              // @ts-expect-error
              class: 'TestClass',
            },
          },
        },
      ],
    })

    const res = await client.request<any>(
      gql`
				mutation createTestClass {
					createTestClass2(
						input: {
							fields: {
								name: "name"
								field2: { createAndLink: { field1: "field1" } }
							}
						}
					) {
						testClass2 {
							name
							field2 {
								field1
							}
						}
					}
				}
			`,
      {},
    )

    expect(res.createTestClass2.testClass2.name).toBe('name')
    expect(res.createTestClass2.testClass2.field2.field1).toBe('field1')

    const queryRes = await client.request<any>(gql`
			query testClass2s {
				testClass2s(
					where: { field2: { field1: { equalTo: "field1" } } }
				) {
					edges {
						node {
							name
						}
					}
				}
			}
		`)

    expect(queryRes.testClass2s.edges.length).toBe(1)
    expect(queryRes.testClass2s.edges[0].node.name).toBe('name')

    await wabe.close()
  })

  it('should filter an object (on updates) with pointer field', async () => {
    const { client, wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: {
            field1: {
              type: 'String',
            },
          },
        },
        {
          name: 'TestClass2',
          fields: {
            name: {
              type: 'String',
            },
            field2: {
              type: 'Pointer',
              // @ts-expect-error
              class: 'TestClass',
            },
          },
        },
      ],
    })

    const res = await client.request<any>(
      gql`
				mutation createTestClass {
					createTestClass2(
						input: {
							fields: {
								name: "name"
								field2: { createAndLink: { field1: "field1" } }
							}
						}
					) {
						testClass2 {
							name
							field2 {
								field1
							}
						}
					}
				}
			`,
      {},
    )

    expect(res.createTestClass2.testClass2.name).toBe('name')
    expect(res.createTestClass2.testClass2.field2.field1).toBe('field1')

    const updateRes = await client.request<any>(gql`
			mutation updateTestClass2s {
				updateTestClass2s(
					input: {
						fields: { name: "name2" }
						where: { field2: { field1: { equalTo: "field1" } } }
					}
				) {
					edges {
						node {
							name
						}
					}
				}
			}
		`)

    expect(updateRes.updateTestClass2s.edges.length).toBe(1)
    expect(updateRes.updateTestClass2s.edges[0].node.name).toBe('name2')

    await wabe.close()
  })

  it('should filter an object (on deletes) with pointer field', async () => {
    const { client, wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: {
            field1: {
              type: 'String',
            },
          },
        },
        {
          name: 'TestClass2',
          fields: {
            name: {
              type: 'String',
            },
            field2: {
              type: 'Pointer',
              // @ts-expect-error
              class: 'TestClass',
            },
          },
        },
      ],
    })

    const res = await client.request<any>(
      gql`
				mutation createTestClass {
					createTestClass2(
						input: {
							fields: {
								name: "name"
								field2: { createAndLink: { field1: "field1" } }
							}
						}
					) {
						testClass2 {
							name
							field2 {
								field1
							}
						}
					}
				}
			`,
      {},
    )

    expect(res.createTestClass2.testClass2.name).toBe('name')
    expect(res.createTestClass2.testClass2.field2.field1).toBe('field1')

    const deleteRes = await client.request<any>(gql`
			mutation deleteTestClass2s {
				deleteTestClass2s(
					input: {
						where: { field2: { field1: { equalTo: "field1" } } }
					}
				) {
					edges {
						node {
							name
						}
					}
				}
			}
		`)

    expect(deleteRes.deleteTestClass2s.edges.length).toBe(1)
    expect(deleteRes.deleteTestClass2s.edges[0].node.name).toBe('name')

    await wabe.close()
  })

  it('should create and link a pointer on update', async () => {
    const { client, wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: {
            field1: {
              type: 'String',
            },
          },
        },
        {
          name: 'TestClass2',
          fields: {
            name: {
              type: 'String',
            },
            field2: {
              type: 'Pointer',
              // @ts-expect-error
              class: 'TestClass',
            },
          },
        },
      ],
    })

    const res = await client.request<any>(
      gql`
				mutation createTestClass {
					createTestClass2(
						input: {
							fields: {
								name: "name"
								field2: { createAndLink: { field1: "field1" } }
							}
						}
					) {
						testClass2 {
							id
							name
							field2 {
								field1
							}
						}
					}
				}
			`,
      {},
    )

    expect(res.createTestClass2.testClass2.name).toBe('name')
    expect(res.createTestClass2.testClass2.field2.field1).toBe('field1')

    const resAfterUpdate = await client.request<any>(gql`
			mutation updateTestClass {
				updateTestClass2(
					input: {
						fields: {
							field2: {
								createAndLink: { field1: "field1AfterUpdate" }
							}
						}
						id: "${res.createTestClass2.testClass2.id}"
					}
				) {
					testClass2 {
						name
						field2 {
							field1
						}
					}
				}
			}
		`)

    expect(resAfterUpdate.updateTestClass2.testClass2.name).toBe('name')
    expect(resAfterUpdate.updateTestClass2.testClass2.field2.field1).toBe(
      'field1AfterUpdate',
    )

    await wabe.close()
  })

  it('should link a pointer on update', async () => {
    const { client, wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: {
            field1: {
              type: 'String',
            },
          },
        },
        {
          name: 'TestClass2',
          fields: {
            name: {
              type: 'String',
            },
            field2: {
              type: 'Pointer',
              // @ts-expect-error
              class: 'TestClass',
            },
          },
        },
      ],
    })

    const {
      createTestClass: {
        testClass: { id: idOfTestClass },
      },
    } = await client.request<any>(
      gql`
				mutation createTestClass {
					createTestClass(input: { fields: { field1: "field1" } }) {
						testClass {
							id
						}
					}
				}
			`,
      {},
    )

    const res = await client.request<any>(
      gql`
				mutation createTestClass {
					createTestClass2(input: { fields: { name: "name" } }) {
						testClass2 {
							id
							name
						}
					}
				}
			`,
      {},
    )

    const resAfterUpdate = await client.request<any>(
      gql`
				mutation updateTestClass {
					updateTestClass2(input: {
  					id: "${res.createTestClass2.testClass2.id}"
  					fields: {
   				     field2: { link: "${idOfTestClass}" }
  					}
					}){
					  testClass2 {
							name
							field2{
							 field1
							}
						}
					}
				}
			`,
      {},
    )

    expect(resAfterUpdate.updateTestClass2.testClass2.name).toBe('name')
    expect(resAfterUpdate.updateTestClass2.testClass2.field2.field1).toBe(
      'field1',
    )

    await wabe.close()
  })

  it('should unlink a pointer on update', async () => {
    const { client, wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: {
            field1: {
              type: 'String',
            },
          },
        },
        {
          name: 'TestClass2',
          fields: {
            name: {
              type: 'String',
            },
            field2: {
              type: 'Pointer',
              // @ts-expect-error
              class: 'TestClass',
            },
          },
        },
      ],
    })

    const {
      createTestClass: {
        testClass: { id: idOfTestClass },
      },
    } = await client.request<any>(
      gql`
				mutation createTestClass {
					createTestClass(input: { fields: { field1: "field1" } }) {
						testClass {
							id
						}
					}
				}
			`,
      {},
    )

    const res = await client.request<any>(
      gql`
				mutation createTestClass {
					createTestClass2(input: { fields: { name: "name", field2: { link : "${idOfTestClass}"} }}) {
						testClass2 {
							id
							name
							field2 {
								field1
							}
						}
					}
				}
			`,
      {},
    )

    expect(res.createTestClass2.testClass2.field2.field1).toBe('field1')

    const res2 = await client.request<any>(
      gql`
				mutation updateTestClass2 {
					updateTestClass2(input: {
  					id: "${res.createTestClass2.testClass2.id}"
  					fields: {
   				     field2: { unlink: true }
  					}
					}){
					  testClass2 {
							name
							field2{
							 field1
							}
						}
					}
				}
			`,
      {},
    )

    expect(res2.updateTestClass2.testClass2.field2).toBeNull()

    await wabe.close()
  })

  it('should link a pointer on update multiple object', async () => {
    const { client, wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: {
            field1: {
              type: 'String',
            },
          },
        },
        {
          name: 'TestClass2',
          fields: {
            name: {
              type: 'String',
            },
            field2: {
              type: 'Pointer',
              // @ts-expect-error
              class: 'TestClass',
            },
          },
        },
      ],
    })

    await client.request<any>(
      gql`
				mutation createTestClass2s {
					createTestClass2s(
						input: { fields: [{ name: "name" }, { name: "name2" }] }
					) {
						edges {
							node {
								name
							}
						}
					}
				}
			`,
      {},
    )

    const resAfterUpdate = await client.request<any>(
      gql`
				mutation updateTestClass2s {
					updateTestClass2s(
						input: {
							where: { name: { equalTo: "name" } }
							fields: {
								field2: {
									createAndLink: {
										field1: "field1UpdateMultiple"
									}
								}
							}
						}
					) {
						edges {
							node {
								name
								field2 {
									field1
								}
							}
						}
					}
				}
			`,
      {},
    )

    expect(resAfterUpdate.updateTestClass2s.edges[0].node.name).toBe('name')
    expect(resAfterUpdate.updateTestClass2s.edges[0].node.field2.field1).toBe(
      'field1UpdateMultiple',
    )

    await wabe.close()
  })

  it('should return pointer data on delete an element', async () => {
    const { client, wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: {
            field1: {
              type: 'String',
            },
          },
        },
        {
          name: 'TestClass2',
          fields: {
            name: {
              type: 'String',
            },
            field2: {
              type: 'Pointer',
              // @ts-expect-error
              class: 'TestClass',
            },
          },
        },
      ],
    })

    const res = await client.request<any>(
      gql`
				mutation createTestClass {
					createTestClass2(
						input: {
							fields: {
								name: "name"
								field2: { createAndLink: { field1: "field1" } }
							}
						}
					) {
						testClass2 {
							id
							name
							field2 {
								field1
							}
						}
					}
				}
			`,
      {},
    )

    expect(res.createTestClass2.testClass2.name).toBe('name')
    expect(res.createTestClass2.testClass2.field2.field1).toBe('field1')

    const resAfterDelete = await client.request<any>(gql`
			mutation deleteTestClass2 {
				deleteTestClass2(input: {id: "${res.createTestClass2.testClass2.id}"}) {
					testClass2 {
					  name
						field2 {
							field1
						}
					}
				}
			}
		`)

    expect(resAfterDelete.deleteTestClass2.testClass2.name).toBe('name')
    expect(resAfterDelete.deleteTestClass2.testClass2.field2.field1).toBe(
      'field1',
    )

    await wabe.close()
  })

  it('should createAndAdd an object on a relation field (on create)', async () => {
    const { client, wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: {
            field1: {
              type: 'String',
            },
          },
        },
        {
          name: 'TestClass2',
          fields: {
            name: {
              type: 'String',
            },
            field2: {
              type: 'Relation',
              // @ts-expect-error
              class: 'TestClass',
            },
          },
        },
      ],
    })

    const res = await client.request<any>(gql`
			mutation createTestClass2 {
				createTestClass2(
					input: {
						fields: {
							name: "name"
							field2: { createAndAdd: [{ field1: "field1" }, { field1: "field2" }] }
						}
					}
				) {
					testClass2 {
						name
						field2 {
							edges {
								node {
									field1
								}
							}
						}
					}
				}
			}
		`)

    const field2AfterUpdate1 = (await wabe.controllers.database.getObjects({
      // @ts-expect-error
      className: 'TestClass2',
      context: {
        wabe,
        isRoot: true,
      },
    })) as any

    expect(field2AfterUpdate1[0]?.field2.length).toBe(2)

    expect(res.createTestClass2.testClass2.name).toBe('name')
    expect(res.createTestClass2.testClass2.field2.edges[0].node.field1).toBe(
      'field1',
    )

    await wabe.close()
  })

  it('should add an object on a relation field (on create)', async () => {
    const { client, wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: {
            field1: {
              type: 'String',
            },
          },
        },
        {
          name: 'TestClass2',
          fields: {
            name: {
              type: 'String',
            },
            field2: {
              type: 'Relation',
              // @ts-expect-error
              class: 'TestClass',
            },
          },
        },
      ],
    })

    const res = await client.request<any>(gql`
			mutation createTestClass {
				createTestClass(input: { fields: { field1: "field1" } }) {
					testClass {
						id
					}
				}
			}
		`)

    const resAfterAdd = await client.request<any>(gql`
			mutation createTestClass2 {
				createTestClass2(
					input: {
						fields: {
							name: "name"
							field2: { add: ["${res.createTestClass.testClass.id}"] }
						}
					}
				) {
					testClass2 {
						name
						field2 {
							edges {
								node {
									field1
								}
							}
						}
					}
				}
			}
		`)

    expect(resAfterAdd.createTestClass2.testClass2.name).toBe('name')
    expect(
      resAfterAdd.createTestClass2.testClass2.field2.edges[0].node.field1,
    ).toBe('field1')

    await wabe.close()
  })

  it('should createAndAdd an object on a relation field (on createMany)', async () => {
    const { client, wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: {
            field1: {
              type: 'String',
            },
          },
        },
        {
          name: 'TestClass2',
          fields: {
            name: {
              type: 'String',
            },
            field2: {
              type: 'Relation',
              // @ts-expect-error
              class: 'TestClass',
            },
          },
        },
      ],
    })

    const res = await client.request<any>(gql`
			mutation createTestClass2s {
				createTestClass2s(
					input: {
						fields: [
							{
								name: "name"
								field2: { createAndAdd: [{ field1: "field1" }] }
							}
						]
					}
				) {
					edges {
						node {
							name
							field2 {
								edges {
									node {
										field1
									}
								}
							}
						}
					}
				}
			}
		`)

    expect(res.createTestClass2s.edges[0].node.name).toBe('name')
    expect(
      res.createTestClass2s.edges[0].node.field2.edges[0].node.field1,
    ).toBe('field1')

    await wabe.close()
  })

  it('should add an object on a relation field (on createMany)', async () => {
    const { client, wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: {
            field1: {
              type: 'String',
            },
          },
        },
        {
          name: 'TestClass2',
          fields: {
            name: {
              type: 'String',
            },
            field2: {
              type: 'Relation',
              // @ts-expect-error
              class: 'TestClass',
            },
          },
        },
      ],
    })

    const res = await client.request<any>(gql`
			mutation createTestClass {
				createTestClass(input: { fields: { field1: "field1" } }) {
					testClass {
						id
					}
				}
			}
		`)

    const resAfterAdd = await client.request<any>(gql`
			mutation createTestClass2s {
				createTestClass2s(
					input: {
						fields: [
							{
								name: "name"
								field2: { add: ["${res.createTestClass.testClass.id}"] }
							}
						]
					}
				) {
					edges {
						node {
							name
							field2 {
								edges {
									node {
										field1
									}
								}
							}
						}
					}
				}
			}
		`)

    expect(resAfterAdd.createTestClass2s.edges[0].node.name).toBe('name')
    expect(
      resAfterAdd.createTestClass2s.edges[0].node.field2.edges[0].node.field1,
    ).toBe('field1')

    await wabe.close()
  })

  it('should createAndAdd an object on a relation field (on update)', async () => {
    const { client, wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: {
            field1: {
              type: 'String',
            },
          },
        },
        {
          name: 'TestClass2',
          fields: {
            name: {
              type: 'String',
            },
            field2: {
              type: 'Relation',
              // @ts-expect-error
              class: 'TestClass',
            },
          },
        },
      ],
    })

    const resAfterAdd = await client.request<any>(gql`
			mutation createTestClass2 {
				createTestClass2(input: { fields: { name: "name" } }) {
					testClass2 {
						id
						name
					}
				}
			}
		`)

    const resAfterUpdate = await client.request<any>(gql`
			mutation updateTestClass2 {
				updateTestClass2(
					input: {
						id: "${resAfterAdd.createTestClass2.testClass2.id}"
						fields: {
							field2: { createAndAdd: [{ field1: "field1" }] }
						}
					}
				) {
					testClass2 {
						id
						name
						field2 {
							edges {
  							node {
  							   field1
  							}
							}
						}
					}
				}
			}
		`)

    expect(resAfterUpdate.updateTestClass2.testClass2.name).toBe('name')
    expect(
      resAfterUpdate.updateTestClass2.testClass2.field2.edges[0].node.field1,
    ).toBe('field1')

    await wabe.close()
  })

  it('should add an object on a relation field (on update)', async () => {
    const { client, wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: {
            field1: {
              type: 'String',
            },
          },
        },
        {
          name: 'TestClass2',
          fields: {
            name: {
              type: 'String',
            },
            field2: {
              type: 'Relation',
              // @ts-expect-error
              class: 'TestClass',
            },
          },
        },
      ],
    })

    const res = await client.request<any>(gql`
			mutation createTestClass {
				createTestClass(input: { fields: { field1: "field1" } }) {
					testClass {
						id
					}
				}
			}
		`)

    const res2 = await client.request<any>(gql`
			mutation createTestClass {
				createTestClass(input: { fields: { field1: "field1" } }) {
					testClass {
						id
					}
				}
			}
		`)

    const resAfterAdd = await client.request<any>(gql`
			mutation createTestClass2 {
				createTestClass2(input: { fields: { name: "name" } }) {
					testClass2 {
						id
						name
					}
				}
			}
		`)

    await client.request<any>(gql`
			mutation updateTestClass2 {
				updateTestClass2(
					input: {
						id: "${resAfterAdd.createTestClass2.testClass2.id}"
						fields: {
							field2: { add: ["${res.createTestClass.testClass.id}"] }
						}
					}
				) {
					testClass2 {
						id
						name
						field2 {
							edges {
  							node {
  							   field1
  							}
							}
						}
					}
				}
			}
		`)

    const field2AfterUpdate1 = (await wabe.controllers.database.getObjects({
      // @ts-expect-error
      className: 'TestClass2',
      context: {
        wabe,
        isRoot: true,
      },
    })) as any

    expect(field2AfterUpdate1[0]?.field2.length).toBe(1)

    const resAfterUpdate2 = await client.request<any>(gql`
    	mutation updateTestClass2 {
    		updateTestClass2(
    			input: {
    				id: "${resAfterAdd.createTestClass2.testClass2.id}"
    				fields: {
    					field2: { add: ["${res2.createTestClass.testClass.id}"] }
    				}
    			}
    		) {
    			testClass2 {
    				id
    				name
    				field2 {
    					edges {
    							node {
    							   field1
    							}
    					}
    				}
    			}
    		}
    	}
    `)

    const field2AfterUpdate2 = (await wabe.controllers.database.getObjects({
      // @ts-expect-error
      className: 'TestClass2',
      context: {
        wabe,
        isRoot: true,
      },
      // @ts-expect-error
      select: { field2: true },
    })) as any

    expect(field2AfterUpdate2[0].field2).toEqual([
      { id: res.createTestClass.testClass.id },
      { id: res2.createTestClass.testClass.id },
    ])
    expect(field2AfterUpdate2[0]?.field2.length).toBe(2)

    expect(resAfterUpdate2.updateTestClass2.testClass2.name).toBe('name')
    expect(
      resAfterUpdate2.updateTestClass2.testClass2.field2.edges.length,
    ).toBe(2)
    expect(
      resAfterUpdate2.updateTestClass2.testClass2.field2.edges[0].node.field1,
    ).toBe('field1')

    await wabe.close()
  })

  it('should remove an object on a relation field (on update)', async () => {
    const { client, wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: {
            field1: {
              type: 'String',
            },
          },
        },
        {
          name: 'TestClass2',
          fields: {
            name: {
              type: 'String',
            },
            field2: {
              type: 'Relation',
              // @ts-expect-error
              class: 'TestClass',
            },
          },
        },
      ],
    })

    const resAfterAdd = await client.request<any>(gql`
			mutation createTestClass2 {
				createTestClass2(
					input: {
						fields: {
							name: "name"
							field2: { createAndAdd: [{ field1: "field1" }] }
						}
					}
				) {
					testClass2 {
						id
						name
						field2 {
							edges {
								node {
									id
									field1
								}
							}
						}
					}
				}
			}
		`)

    const resAfterUpdate = await client.request<any>(gql`
			mutation updateTestClass2 {
				updateTestClass2(
					input: {
						id: "${resAfterAdd.createTestClass2.testClass2.id}"
						fields: {
							field2: { remove: ["${resAfterAdd.createTestClass2.testClass2.field2.edges[0].node.id}"] }
						}
					}
				) {
					testClass2 {
						id
						name
						field2 {
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

    expect(resAfterUpdate.updateTestClass2.testClass2.name).toBe('name')
    expect(
      resAfterUpdate.updateTestClass2.testClass2.field2.edges.length,
    ).toEqual(0)

    await wabe.close()
  })

  it('should createAndAdd an object on a relation field (on updateMany)', async () => {
    const { client, wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: {
            field1: {
              type: 'String',
            },
          },
        },
        {
          name: 'TestClass2',
          fields: {
            name: {
              type: 'String',
            },
            field2: {
              type: 'Relation',
              // @ts-expect-error
              class: 'TestClass',
            },
          },
        },
      ],
    })

    const resAfterAdd = await client.request<any>(gql`
			mutation createTestClass2 {
				createTestClass2(input: { fields: { name: "name" } }) {
					testClass2 {
						id
						name
					}
				}
			}
		`)

    const resAfterUpdate = await client.request<any>(gql`
			mutation updateTestClass2s {
				updateTestClass2s(
					input: {
						where: {id: {equalTo: "${resAfterAdd.createTestClass2.testClass2.id}"}}
						fields: {
							field2: { createAndAdd: [{ field1: "field1" }] }
						}
					}
				) {
					edges {
						node {
							id
							name
							field2 {
								edges {
									node {
										field1
									}
								}
							}
						}
					}
				}
			}
		`)

    expect(resAfterUpdate.updateTestClass2s.edges[0].node.name).toBe('name')
    expect(
      resAfterUpdate.updateTestClass2s.edges[0].node.field2.edges[0].node
        .field1,
    ).toBe('field1')

    await wabe.close()
  })

  it('should add an object on a relation field (on updateMany)', async () => {
    const { client, wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: {
            field1: {
              type: 'String',
            },
          },
        },
        {
          name: 'TestClass2',
          fields: {
            name: {
              type: 'String',
            },
            field2: {
              type: 'Relation',
              // @ts-expect-error
              class: 'TestClass',
            },
          },
        },
      ],
    })

    const res = await client.request<any>(gql`
			mutation createTestClass {
				createTestClass(input: { fields: { field1: "field1" } }) {
					testClass {
						id
					}
				}
			}
		`)

    const res2 = await client.request<any>(gql`
			mutation createTestClass {
				createTestClass(input: { fields: { field1: "field1" } }) {
					testClass {
						id
					}
				}
			}
		`)

    const resAfterAdd = await client.request<any>(gql`
			mutation createTestClass2 {
				createTestClass2(input: { fields: { name: "name" } }) {
					testClass2 {
						id
						name
					}
				}
			}
		`)

    await client.request<any>(gql`
			mutation updateTestClass2s {
				updateTestClass2s(
					input: {
						where: {id: {equalTo: "${resAfterAdd.createTestClass2.testClass2.id}"}}
						fields: {
							field2: { add: ["${res.createTestClass.testClass.id}"] }
						}
					}
				) {
					edges {
						node {
							id
							name
							field2 {
								edges {
									node {
										field1
									}
								}
							}
						}
					}
				}
			}
		`)

    const resAfterUpdate = await client.request<any>(gql`
			mutation updateTestClass2s {
				updateTestClass2s(
					input: {
						where: {id: {equalTo: "${resAfterAdd.createTestClass2.testClass2.id}"}}
						fields: {
							field2: { add: ["${res2.createTestClass.testClass.id}"] }
						}
					}
				) {
					edges {
						node {
							id
							name
							field2 {
								edges {
									node {
										field1
									}
								}
							}
						}
					}
				}
			}
		`)

    const field2AfterUpdate2 = (await wabe.controllers.database.getObjects({
      // @ts-expect-error
      className: 'TestClass2',
      context: {
        wabe,
        isRoot: true,
      },
      // @ts-expect-error
      select: { field2: true },
    })) as any

    expect(field2AfterUpdate2[0]?.field2.length).toBe(2)
    expect(field2AfterUpdate2[0]?.field2).toEqual([
      { id: res.createTestClass.testClass.id },
      { id: res2.createTestClass.testClass.id },
    ])

    expect(resAfterUpdate.updateTestClass2s.edges[0].node.name).toBe('name')
    expect(
      resAfterUpdate.updateTestClass2s.edges[0].node.field2.edges[0].node
        .field1,
    ).toBe('field1')

    await wabe.close()
  })

  it('should remove an object on a relation field (on updateMany)', async () => {
    const { client, wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: {
            field1: {
              type: 'String',
            },
          },
        },
        {
          name: 'TestClass2',
          fields: {
            name: {
              type: 'String',
            },
            field2: {
              type: 'Relation',
              // @ts-expect-error
              class: 'TestClass',
            },
          },
        },
      ],
    })

    const resAfterAdd = await client.request<any>(gql`
			mutation createTestClass2 {
				createTestClass2(
					input: {
						fields: {
							name: "name"
							field2: { createAndAdd: [{ field1: "field1" }] }
						}
					}
				) {
					testClass2 {
						id
						name
						field2 {
							edges {
								node {
									id
									field1
								}
							}
						}
					}
				}
			}
		`)

    const field2BeforeUpdate2 = (await wabe.controllers.database.getObjects({
      // @ts-expect-error
      className: 'TestClass2',
      context: {
        wabe,
        isRoot: true,
      },
      // @ts-expect-error
      select: { field2: true },
    })) as any

    expect(field2BeforeUpdate2[0]?.field2).toEqual([
      { id: resAfterAdd.createTestClass2.testClass2.field2.edges[0].node.id },
    ])

    const resAfterUpdate = await client.request<any>(gql`
			mutation updateTestClass2s {
				updateTestClass2s(
					input: {
						where: {id: {equalTo: "${resAfterAdd.createTestClass2.testClass2.id}"}}
						fields: {
							field2: { remove: ["${resAfterAdd.createTestClass2.testClass2.field2.edges[0].node.id}"] }
						}
					}
				) {
					edges {
						node {
							id
							name
							field2 {
								edges {
									node {
										field1
									}
								}
							}
						}
					}
				}
			}
		`)

    const field2AfterUpdate2 = (await wabe.controllers.database.getObjects({
      // @ts-expect-error
      className: 'TestClass2',
      context: {
        wabe,
        isRoot: true,
      },
    })) as any

    expect(field2AfterUpdate2[0]?.field2).toEqual([])

    expect(resAfterUpdate.updateTestClass2s.edges[0].node.name).toBe('name')
    expect(
      resAfterUpdate.updateTestClass2s.edges[0].node.field2.edges.length,
    ).toBe(0)

    const resAfterRemove = await client.request<any>(gql`
        query testClasses {
          testClasses{
            edges {
              node {
                field1
              }
            }
          }
        }
      `)

    expect(resAfterRemove.testClasses.edges.length).toBe(0)

    await wabe.close()
  })

  it('should remove an object on a relation field (on update)', async () => {
    const { client, wabe } = await createWabe({
      classes: [
        {
          name: 'TestClass',
          fields: {
            field1: {
              type: 'String',
            },
          },
        },
        {
          name: 'TestClass2',
          fields: {
            name: {
              type: 'String',
            },
            field2: {
              type: 'Relation',
              // @ts-expect-error
              class: 'TestClass',
            },
          },
        },
      ],
    })

    const resAfterAdd = await client.request<any>(gql`
			mutation createTestClass2 {
				createTestClass2(
					input: {
						fields: {
							name: "name"
							field2: { createAndAdd: [{ field1: "field1" }] }
						}
					}
				) {
					testClass2 {
						id
						name
						field2 {
							edges {
								node {
									id
									field1
								}
							}
						}
					}
				}
			}
		`)

    const resAfterUpdate = await client.request<any>(gql`
			mutation updateTestClass2 {
				updateTestClass2(
					input: {
            id: "${resAfterAdd.createTestClass2.testClass2.id}"
						fields: {
							field2: { remove: ["${resAfterAdd.createTestClass2.testClass2.field2.edges[0].node.id}"] }
						}
					}
				) {
					testClass2{
    					id
    					name
    					field2 {
    						edges {
    							node {
    								field1
    							}
    						}
    					}
					}
				}
			}
		`)

    const field2AfterUpdate2 = (await wabe.controllers.database.getObjects({
      // @ts-expect-error
      className: 'TestClass2',
      context: {
        wabe,
        isRoot: true,
      },
    })) as any

    expect(field2AfterUpdate2[0]?.field2.length).toBe(0)

    expect(resAfterUpdate.updateTestClass2.testClass2.name).toBe('name')
    expect(resAfterUpdate.updateTestClass2.testClass2.field2.edges.length).toBe(
      0,
    )

    const resAfterRemove = await client.request<any>(gql`
        query testClasses {
          testClasses{
            edges {
              node {
                field1
              }
            }
          }
        }
      `)

    expect(resAfterRemove.testClasses.edges.length).toBe(0)

    await wabe.close()
  })
})
