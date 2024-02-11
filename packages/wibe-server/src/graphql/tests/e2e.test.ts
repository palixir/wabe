import {
    afterAll,
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
} from 'bun:test'
import { WibeApp } from '../../server'
import { gql } from '@elysiajs/apollo'
import { closeTests, getGraphqlClient, setupTests } from '../../utils/helper'
import { GraphQLClient } from 'graphql-request'

const cleanUsers = async (client: GraphQLClient) => {
    const { findMany_User } = await client.request<any>(
        graphql.findMany_User,
        {},
    )
    await Promise.all(
        findMany_User.edges.map(({ node }: { node: any }) =>
            client.request<any>(graphql.deleteOne_User, {
                input: { id: node.id },
            }),
        ),
    )
}

describe('GraphQL : E2E', () => {
    let wibe: WibeApp
    let port: number
    let client: GraphQLClient

    beforeAll(async () => {
        const setup = await setupTests()
        wibe = setup.wibe
        port = setup.port
        client = getGraphqlClient(port)
    })

    beforeEach(async () => {
        await client.request<any>(graphql.createMany_User, {
            input: {
                fields: [
                    { name: 'Lucas', age: 23, email: 'email@test.fr' },
                    { name: 'Jeanne', age: 23, email: 'email@test.fr' },
                ],
            },
        })
    })

    afterEach(async () => {
        await cleanUsers(client)
    })

    afterAll(async () => {
        await closeTests(wibe)
    })

    it("should use pagination with 'offset' and 'limit' arguments", async () => {
        await cleanUsers(client)

        const res = await client.request<any>(graphql.createMany_User, {
            input: {
                fields: [
                    {
                        name: 'Toto1',
                        email: 'email@test.fr',
                    },
                    { name: 'Toto2', email: 'email@test.fr' },
                    { name: 'Toto3', email: 'email@test.fr' },
                    { name: 'Toto4', email: 'email@test.fr' },
                    { name: 'Toto5', email: 'email@test.fr' },
                    { name: 'Toto6', email: 'email@test.fr' },
                    { name: 'Toto7', email: 'email@test.fr' },
                    { name: 'Toto8', email: 'email@test.fr' },
                    { name: 'Toto9', email: 'email@test.fr' },
                    { name: 'Toto10', email: 'email@test.fr' },
                ],
                offset: 0,
                limit: 5,
            },
        })

        expect(res.createMany_User.edges.length).toEqual(5)

        const { findMany_User } = await client.request<any>(
            graphql.findMany_User,
            {
                offset: 5,
                limit: 2,
            },
        )

        expect(findMany_User.edges.length).toEqual(2)
        expect(findMany_User.edges[0].node.name).toEqual('Toto6')
    })

    it('should create user with custom object in schema', async () => {
        await client.request<any>(graphql.createMany_User, {
            input: {
                fields: [
                    {
                        name: 'Jean',
                        address: {
                            address1: '1 rue de la paix',
                            address2: '2 rue de la paix',
                            postalCode: 75000,
                            city: 'Paris',
                            country: 'France',
                        },
                        email: 'email@test.fr',
                    },
                    {
                        name: 'Jeanne',
                        age: 23,
                        email: 'email@test.fr',
                    },
                ],
            },
        })

        const { findMany_User } = await client.request<any>(
            graphql.findMany_User,
            {
                where: {
                    address: {
                        address1: {
                            equalTo: '1 rue de la paix',
                        },
                    },
                },
            },
        )

        expect(findMany_User.edges.length).toEqual(1)
        expect(findMany_User.edges[0].node.name).toEqual('Jean')

        const { findMany_User: users2 } = await client.request<any>(
            graphql.findMany_User,
            {
                where: {
                    address: {
                        postalCode: {
                            equalTo: 75000,
                        },
                    },
                },
            },
        )

        expect(users2.edges.length).toEqual(1)
        expect(users2.edges[0].node.name).toEqual('Jean')

        const { findMany_User: users3 } = await client.request<any>(
            graphql.findMany_User,
            {
                where: {
                    address: {
                        address1: {
                            notEqualTo: '1 rue de la paix',
                        },
                    },
                },
            },
        )

        expect(users3.edges.length).toEqual(3)
    })

    it('should create user with object of object in schema', async () => {
        await client.request<any>(graphql.createMany_User, {
            input: {
                fields: [
                    {
                        name: 'Jean',
                        object: {
                            objectOfObject: {
                                name: 'object',
                            },
                        },
                        email: 'email@test.fr',
                    },
                ],
            },
        })

        const { findMany_User } = await client.request<any>(
            graphql.findMany_User,
            {
                where: {
                    object: {
                        objectOfObject: {
                            name: { equalTo: 'object' },
                        },
                    },
                },
            },
        )

        expect(findMany_User.edges.length).toEqual(1)
        expect(findMany_User.edges[0].node.name).toEqual('Jean')

        const { findMany_User: users2 } = await client.request<any>(
            graphql.findMany_User,
            {
                where: {
                    object: {
                        objectOfObject: {
                            name: { equalTo: 'object2' },
                        },
                    },
                },
            },
        )

        expect(users2.edges.length).toEqual(0)

        const { findMany_User: users3 } = await client.request<any>(
            graphql.findMany_User,
            {
                where: {
                    object: {
                        objectOfObject: {
                            name: { notEqualTo: 'object' },
                        },
                    },
                },
            },
        )

        expect(users3.edges.length).toEqual(2)
    })

    it('should create user with custom enum (Role)', async () => {
        await client.request<any>(graphql.createMany_User, {
            input: {
                fields: [
                    { name: 'Jack', role: 'Admin', email: 'email@test.fr' },
                ],
            },
        })

        const { findMany_User } = await client.request<any>(
            graphql.findMany_User,
            {
                where: {
                    role: {
                        equalTo: 'Admin',
                    },
                },
            },
        )

        expect(findMany_User.edges.length).toEqual(1)
        expect(findMany_User.edges[0].node.name).toEqual('Jack')

        const { findMany_User: users2 } = await client.request<any>(
            graphql.findMany_User,
            {
                where: {
                    role: {
                        notEqualTo: 'Admin',
                    },
                },
            },
        )

        expect(users2.edges.length).toEqual(2)
        expect(users2.edges).toEqual([
            {
                node: {
                    id: expect.anything(),
                    name: 'Lucas',
                    age: 23,
                },
            },
            {
                node: {
                    id: expect.anything(),
                    name: 'Jeanne',
                    age: 23,
                },
            },
        ])
    })

    it('should create user with a custom scalar (phone)', async () => {
        await client.request<any>(graphql.createMany_User, {
            input: {
                fields: [
                    {
                        name: 'Jack',
                        phone: '+33577223355',
                        email: 'email@test.fr',
                    },
                ],
            },
        })

        const { findMany_User } = await client.request<any>(
            graphql.findMany_User,
            {
                where: {
                    phone: {
                        equalTo: '+33577223355',
                    },
                },
            },
        )

        expect(findMany_User.edges.length).toEqual(1)
        expect(findMany_User.edges[0].node.name).toEqual('Jack')

        const { findMany_User: users2 } = await client.request<any>(
            graphql.findMany_User,
            {
                where: {
                    phone: {
                        notEqualTo: '+33577223355',
                    },
                },
            },
        )

        expect(users2.edges.length).toEqual(2)
        expect(users2.edges).toEqual([
            {
                node: {
                    id: expect.anything(),
                    name: 'Lucas',
                    age: 23,
                },
            },
            {
                node: {
                    id: expect.anything(),
                    name: 'Jeanne',
                    age: 23,
                },
            },
        ])
    })

    it('should create custom query successfully', async () => {
        // Test required field
        expect(client.request<any>(graphql.customQuery, {})).rejects.toThrow()

        // Test String param is correctly passed
        expect(
            client.request<any>(graphql.customMutation, {
                input: {
                    name: 1.5,
                },
            }),
        ).rejects.toThrow()

        const res = await client.request<any>(graphql.customQuery, {
            name: 'Lucas',
        })

        expect(res.customQuery).toEqual('Successfull')
    })

    it('should create custom mutation successfully', async () => {
        // Test required field
        expect(
            client.request<any>(graphql.customMutation, {}),
        ).rejects.toThrow()

        // Test Int param is correctly passed
        expect(
            client.request<any>(graphql.customMutation, {
                input: {
                    a: 1.5,
                    b: 1.5,
                },
            }),
        ).rejects.toThrow()

        const res = await client.request<any>(graphql.customMutation, {
            input: {
                a: 1,
                b: 1,
            },
        })

        expect(res.customMutation).toEqual(2)
    })

    it('should get an object that not exist', async () => {
        expect(
            await client.request<any>(graphql.findOne_User, {
                id: '65356f69ea1fe46431076723',
            }),
        ).toEqual({ findOne_User: null })
    })

    it('should get an object', async () => {
        const res = await client.request<any>(graphql.createOne_User, {
            input: {
                fields: {
                    name: 'CurrentUser',
                    age: 99,
                    email: 'email@test.fr',
                },
            },
        })

        const { findOne_User } = await client.request<any>(
            graphql.findOne_User,
            {
                id: res.createOne_User.id,
            },
        )

        expect(findOne_User).toEqual({
            id: res.createOne_User.id,
            name: 'CurrentUser',
            age: 99,
        })
    })

    it('should get multiple objects', async () => {
        const res = await client.request<any>(graphql.findMany_User, {
            input: {
                where: {
                    name: {
                        equalTo: 'Lucas',
                    },
                },
            },
        })

        expect(res.findMany_User.edges).toEqual([
            {
                node: {
                    id: expect.anything(),
                    name: 'Lucas',
                    age: 23,
                },
            },
            {
                node: {
                    id: expect.anything(),
                    name: 'Jeanne',
                    age: 23,
                },
            },
        ])
    })

    it('should create an object', async () => {
        const res = await client.request<any>(graphql.createOne_User, {
            input: {
                fields: {
                    name: 'John',
                    age: 23,
                    email: 'email@test.fr',
                },
            },
        })

        expect(res.createOne_User).toEqual({
            id: expect.anything(),
            name: 'John',
            age: 23,
        })

        expect(
            (
                await client.request<any>(graphql.findMany_User, {
                    where: {
                        name: {
                            equalTo: 'John',
                        },
                    },
                })
            ).findMany_User.edges,
        ).toEqual([
            {
                node: {
                    id: expect.anything(),
                    name: 'John',
                    age: 23,
                },
            },
        ])
    })

    it('should create multiple objects', async () => {
        const res = await client.request<any>(graphql.createMany_User, {
            input: {
                fields: [
                    { name: 'Lucas2', age: 24, email: 'email@test.fr' },
                    { name: 'Jeanne2', age: 24, email: 'email@test.fr' },
                ],
            },
        })

        expect(res.createMany_User.edges).toEqual([
            { node: { name: 'Lucas2', age: 24 } },
            { node: { name: 'Jeanne2', age: 24 } },
        ])

        const { findMany_User } = await client.request<any>(
            graphql.findMany_User,
            {
                where: {
                    name: {
                        equalTo: 'Lucas2',
                    },
                },
            },
        )

        expect(findMany_User.edges).toEqual([
            { node: { id: expect.anything(), name: 'Lucas2', age: 24 } },
        ])

        const users2 = await client.request<any>(graphql.findMany_User, {
            where: {
                age: {
                    equalTo: 24,
                },
            },
        })

        expect(users2.findMany_User.edges).toEqual([
            { node: { id: expect.anything(), name: 'Lucas2', age: 24 } },
            { node: { id: expect.anything(), name: 'Jeanne2', age: 24 } },
        ])
    })

    it('should update one object', async () => {
        const { findMany_User } = await client.request<any>(
            graphql.findMany_User,
            {},
        )

        const userToUpdate = findMany_User.edges[0].node

        const res = await client.request<any>(graphql.updateOne_User, {
            input: {
                id: userToUpdate.id,
                fields: {
                    name: 'NameAfterUpdate',
                },
            },
        })

        expect(res.updateOne_User).toEqual({
            name: 'NameAfterUpdate',
            age: userToUpdate.age,
        })
    })

    it('should update multiple objects', async () => {
        const res = await client.request<any>(graphql.updateMany_User, {
            input: {
                fields: {
                    name: 'Tata',
                },
                where: {
                    name: {
                        equalTo: 'Lucas',
                    },
                },
            },
        })

        expect(res.updateMany_User.edges).toEqual([
            {
                node: {
                    name: 'Tata',
                    age: 23,
                },
            },
        ])
    })

    it('should delete one object', async () => {
        const { findMany_User } = await client.request<any>(
            graphql.findMany_User,
            {},
        )

        const userToDelete = findMany_User.edges[0].node

        expect(findMany_User.edges.length).toEqual(2)

        const res = await client.request<any>(graphql.deleteOne_User, {
            input: {
                id: userToDelete.id,
            },
        })

        expect(res.deleteOne_User).toEqual({
            name: userToDelete.name,
            age: userToDelete.age,
        })

        const { findMany_User: users2 } = await client.request<any>(
            graphql.findMany_User,
            {},
        )

        expect(users2.edges.length).toEqual(1)
    })

    it('should delete multiple objects', async () => {
        const res = await client.request<any>(graphql.deleteMany_User, {
            input: {
                where: {
                    age: {
                        equalTo: 23,
                    },
                },
            },
        })

        expect(res.deleteMany_User.edges).toEqual([
            {
                node: {
                    name: 'Lucas',
                    age: 23,
                },
            },
            {
                node: {
                    name: 'Jeanne',
                    age: 23,
                },
            },
        ])

        const { findMany_User } = await client.request<any>(
            graphql.findMany_User,
            {},
        )

        expect(findMany_User.edges.length).toEqual(0)
    })
})

const graphql = {
    customQuery: gql`
        query customQuery($name: String!) {
            customQuery(name: $name)
        }
    `,
    customMutation: gql`
        mutation customMutation($input: CustomMutationInput!) {
            customMutation(input: $input)
        }
    `,
    findOne_User: gql`
        query findOne_User($id: ID!) {
            findOne_User(id: $id) {
                id
                name
                age
            }
        }
    `,
    findMany_User: gql`
        query findMany_User(
            $where: _UserWhereInput
            $offset: Int
            $limit: Int
        ) {
            findMany_User(where: $where, offset: $offset, limit: $limit) {
                edges {
                    node {
                        id
                        name
                        age
                    }
                }
            }
        }
    `,
    createOne_User: gql`
        mutation createOne_User($input: _UserCreateInput!) {
            createOne_User(input: $input) {
                id
                name
                age
            }
        }
    `,
    createMany_User: gql`
        mutation createMany_User($input: _UsersCreateInput!) {
            createMany_User(input: $input) {
                edges {
                    node {
                        name
                        age
                    }
                }
            }
        }
    `,
    updateOne_User: gql`
        mutation updateOne_User($input: _UserUpdateInput!) {
            updateOne_User(input: $input) {
                name
                age
            }
        }
    `,
    updateMany_User: gql`
        mutation updateMany_User($input: _UsersUpdateInput!) {
            updateMany_User(input: $input) {
                edges {
                    node {
                        name
                        age
                    }
                }
            }
        }
    `,
    deleteOne_User: gql`
        mutation deleteOne_User($input: _UserDeleteInput!) {
            deleteOne_User(input: $input) {
                name
                age
            }
        }
    `,
    deleteMany_User: gql`
        mutation deleteMany_User($input: _UsersDeleteInput!) {
            deleteMany_User(input: $input) {
                edges {
                    node {
                        name
                        age
                    }
                }
            }
        }
    `,
}
