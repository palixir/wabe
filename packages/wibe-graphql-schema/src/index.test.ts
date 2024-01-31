import { describe, expect, it, mock } from 'bun:test'
import { getGraphqlSchema } from './index'

const mockFetch = mock(() => ({
    json: async () => ({
        data: {
            __schema: {
                types: [
                    {
                        name: 'Phone',
                        kind: 'SCALAR',
                    },
                    {
                        name: 'Email',
                        kind: 'SCALAR',
                    },
                    {
                        name: 'Role',
                        kind: 'ENUM',
                        enumValues: [
                            {
                                name: 'Admin',
                            },
                            { name: 'User' },
                        ],
                    },
                    {
                        name: 'Provider',
                        kind: 'ENUM',
                        enumValues: [
                            {
                                name: 'Google',
                            },
                            { name: 'X' },
                        ],
                    },
                    {
                        name: 'Query',
                        kind: 'OBJECT',
                        fields: [
                            {
                                name: 'findOneUser',
                                description: 'Get a user by id',
                                type: {
                                    name: 'User',
                                    kind: 'OBJECT',
                                },
                                args: [
                                    {
                                        name: 'id',
                                        description: 'The id of the user',
                                        type: {
                                            name: 'ID',
                                            kind: 'SCALAR',
                                        },
                                    },
                                ],
                            },
                            {
                                name: 'findManyUser',
                                description: 'Get a list of users',
                                type: {
                                    name: null,
                                    kind: 'LIST',
                                    ofType: {
                                        name: null,
                                        kind: 'NON_NULL',
                                        ofType: {
                                            name: 'UserConnection',
                                        },
                                    },
                                },
                                args: [
                                    {
                                        name: 'where',
                                        description: 'The where clause',
                                        type: {
                                            name: 'UserWhereInput',
                                            kind: 'INPUT_OBJECT',
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        name: 'Mutation',
                        kind: 'OBJECT',
                        fields: [
                            {
                                name: 'createOneUser',
                                description: 'Create a user',
                                type: {
                                    name: 'User',
                                    kind: 'OBJECT',
                                },
                                args: [
                                    {
                                        name: 'age',
                                        description: 'The age of the user',
                                        type: {
                                            name: 'Int',
                                            kind: 'SCALAR',
                                        },
                                    },
                                    {
                                        name: 'name',
                                        description: 'The name of the user',
                                        type: {
                                            name: 'String',
                                            kind: 'SCALAR',
                                        },
                                    },
                                ],
                            },
                            {
                                name: 'createManyUser',
                                description: 'Create a list of users',
                                type: {
                                    name: null,
                                    kind: 'NON_NULL',
                                    ofType: {
                                        name: null,
                                        kind: 'LIST',
                                        ofType: {
                                            name: null,
                                            kind: 'NON_NULL',
                                            ofType: {
                                                name: 'User',
                                            },
                                        },
                                    },
                                },
                                args: [
                                    {
                                        name: 'name',
                                        description: 'The name of the user',
                                        type: {
                                            name: 'String',
                                            kind: 'SCALAR',
                                        },
                                    },
                                    {
                                        name: 'age',
                                        description: 'The age of the user',
                                        type: {
                                            name: 'Int',
                                            kind: 'SCALAR',
                                        },
                                    },
                                ],
                            },
                            {
                                name: 'createManyUserWithOnlyTypeRequired',
                                description: 'Create a list of users',
                                type: {
                                    name: null,
                                    kind: 'NON_NULL',
                                    ofType: {
                                        name: 'User',
                                    },
                                },
                                args: [
                                    {
                                        name: 'name',
                                        description: 'The name of the user',
                                        type: {
                                            name: 'String',
                                            kind: 'SCALAR',
                                        },
                                    },
                                    {
                                        name: 'age',
                                        description: 'The age of the user',
                                        type: {
                                            name: 'Int',
                                            kind: 'SCALAR',
                                        },
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        name: 'User',
                        kind: 'OBJECT',
                        fields: [
                            {
                                name: 'id',
                                description: 'The id of the user',
                                type: {
                                    name: 'ID',
                                    kind: 'SCALAR',
                                },
                            },
                            {
                                name: 'name',
                                description: 'The name of the user',
                                type: {
                                    name: 'String',
                                    kind: 'SCALAR',
                                },
                            },
                        ],
                    },
                    {
                        name: 'UserConnection',
                        kind: 'OBJECT',
                        fields: [
                            {
                                name: 'edges',
                                description: 'The edges of the user',
                                type: {
                                    name: 'UserEdge',
                                    kind: 'OBJECT',
                                },
                            },
                        ],
                    },
                    {
                        name: 'UserWhereInput',
                        kind: 'INPUT_OBJECT',
                        inputFields: [
                            {
                                name: 'id',
                                description: 'The id of the user',
                                type: {
                                    name: 'ID',
                                    kind: 'SCALAR',
                                },
                            },
                            {
                                name: 'name',
                                description: 'The name of the user',
                                type: {
                                    name: 'String',
                                    kind: 'SCALAR',
                                },
                            },
                        ],
                    },
                ],
            },
        },
    }),
}))
// @ts-expect-error
global.fetch = mockFetch

describe('GetGraphqlSchema', () => {
    it('should return a valid json graphql schema', async () => {
        const { enums, scalars, queries, mutations } = await getGraphqlSchema(
            'http://localhost:3000/graphql',
        )

        const schemas = [
            enums.join('\n'),
            scalars.join('\n'),
            queries,
            mutations,
        ].flat()

        expect(schemas).toMatchSnapshot()
    })
})
