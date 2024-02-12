import { v4 as uuid } from 'uuid'
import { GraphQLClient } from 'graphql-request'
import { WibeApp } from '../server'
import { DatabaseEnum } from '../database'
import getPort from 'get-port'

export const notEmpty = <T>(value: T | null | undefined): value is T =>
    value !== null && value !== undefined

export const getGraphqlClient = (port: number): GraphQLClient => {
    const client = new GraphQLClient(`http://127.0.0.1:${port}/graphql`)

    return { ...client, request: client.request<any> } as GraphQLClient
}

export const setupTests = async () => {
    const databaseId = uuid()

    const port = await getPort()

    const wibe = new WibeApp({
        wibeKey:
            '0uwFvUxM$ceFuF1aEtTtZMa7DUN2NZudqgY5ve5W*QCyb58cwMj9JeoaV@d#%29v&aJzswuudVU1%nAT+rxS0Bh&OkgBYc0PH18*',
        database: {
            type: DatabaseEnum.Mongo,
            url: 'mongodb://127.0.0.1:27045',
            name: databaseId,
        },
        port,
        schema: {
            class: [
                {
                    name: '_User',
                    fields: {
                        name: { type: 'String' },
                        age: { type: 'Int' },
                        isAdmin: { type: 'Boolean', defaultValue: false },
                        floatValue: { type: 'Float' },
                        birthDate: { type: 'Date' },
                        arrayValue: {
                            type: 'Array',
                            typeValue: 'String',
                        },
                        phone: {
                            type: 'Phone',
                        },
                        email: {
                            type: 'Email',
                        },
                        role: {
                            type: 'Role',
                            defaultValue: 'Member',
                        },
                        address: {
                            type: 'Object',
                            object: {
                                name: 'Address',
                                fields: {
                                    address1: {
                                        type: 'String',
                                    },
                                    address2: {
                                        type: 'String',
                                    },
                                    postalCode: {
                                        type: 'Int',
                                    },
                                    city: {
                                        type: 'String',
                                    },
                                    country: {
                                        type: 'String',
                                    },
                                },
                            },
                        },
                        object: {
                            type: 'Object',
                            object: {
                                name: 'Object',
                                fields: {
                                    objectOfObject: {
                                        type: 'Object',
                                        object: {
                                            name: 'ObjectOfObject',
                                            fields: {
                                                name: {
                                                    type: 'String',
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    },
                    resolvers: {
                        queries: {
                            customQuery: {
                                type: 'String',
                                args: {
                                    name: {
                                        type: 'String',
                                        required: true,
                                    },
                                },
                                resolve: () => 'Successfull',
                            },
                        },
                        mutations: {
                            customMutation: {
                                type: 'Int',
                                args: {
                                    input: {
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
                                resolve: (root: any, args: any) =>
                                    args.input.a + args.input.b,
                            },
                        },
                    },
                },
            ],
            scalars: [
                {
                    name: 'Phone',
                    description: 'Phone scalar',
                },
            ],
            enums: [
                {
                    name: 'Role',
                    values: {
                        Admin: 'Admin',
                        Member: 'Member',
                    },
                },
            ],
        },
    })

    await wibe.start()

    return { wibe, port }
}

export const closeTests = async (wibe: WibeApp) => {
    await WibeApp.databaseController.adapter?.close()
    await wibe.close()
}
