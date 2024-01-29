import { beforeAll, afterAll, describe, it, expect } from 'bun:test'
import { GraphQLClient, gql } from 'graphql-request'
import { WibeApp } from '../../server'
import { closeTests, getGraphqlClient, setupTests } from '../../utils/helper'

const graphql = {
    findManyUser: gql`
		query findManyUser($where: UserWhereInput) {
			findManyUser(where: $where) {
				edges{
                    node{
    					id
                        name
                        age
                        isAdmin
                        floatValue
                    }
				}
			}
		}
	`,
    createManyUser: gql`
		mutation createManyUser($input: UsersCreateInput!) {
			createManyUser(input: $input) {
				edges{
					node{
                        id
                        name
                        age
                        isAdmin
                        floatValue
                    }
				}
			}
		}
	`,
}

describe('GraphQL : aggregation', () => {
    let wibe: WibeApp
    let port: number
    let client: GraphQLClient

    const now = new Date()

    beforeAll(async () => {
        const setup = await setupTests()
        wibe = setup.wibe
        port = setup.port
        client = getGraphqlClient(port)

        await client.request<any>(graphql.createManyUser, {
            input: {
                fields: [
                    {
                        name: 'Lucas',
                        age: 20,
                        isAdmin: true,
                        floatValue: 1.5,
                        birthDate: now,
                        arrayValue: ['a', 'b'],
                        email: 'lucas@mail.fr',
                    },
                    {
                        name: 'Jeanne',
                        age: 18,
                        isAdmin: false,
                        floatValue: 2.5,
                        birthDate: new Date(Date.now() + 100000),
                        arrayValue: ['c', 'd'],
                        email: 'jean.doe@mail.fr',
                    },
                ],
            },
        })
    })

    afterAll(async () => {
        await closeTests(wibe)
    })

    it("should support Array's aggregation", async () => {
        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    arrayValue: { contains: 'a' },
                },
            }),
        ).toEqual({
            findManyUser: {
                edges: [
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Lucas',
                            age: 20,
                            isAdmin: true,
                            floatValue: 1.5,
                        },
                    },
                ],
            },
        })

        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    arrayValue: { notContains: 'a' },
                },
            }),
        ).toEqual({
            findManyUser: {
                edges: [
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Jeanne',
                            age: 18,
                            isAdmin: false,
                            floatValue: 2.5,
                        },
                    },
                ],
            },
        })

        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    arrayValue: { equalTo: ['a', 'b'] },
                },
            }),
        ).toEqual({
            findManyUser: {
                edges: [
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Lucas',
                            age: 20,
                            isAdmin: true,
                            floatValue: 1.5,
                        },
                    },
                ],
            },
        })

        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    arrayValue: { notEqualTo: ['a', 'b'] },
                },
            }),
        ).toEqual({
            findManyUser: {
                edges: [
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Jeanne',
                            age: 18,
                            isAdmin: false,
                            floatValue: 2.5,
                        },
                    },
                ],
            },
        })

        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    arrayValue: { equalTo: ['z', 'w'] },
                },
            }),
        ).toEqual({
            findManyUser: { edges: [] },
        })

        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    arrayValue: { contains: 'z' },
                },
            }),
        ).toEqual({
            findManyUser: { edges: [] },
        })
    })

    it("should support DateScalarType's aggregation", async () => {
        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    birthDate: { equalTo: now },
                },
            }),
        ).toEqual({
            findManyUser: {
                edges: [
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Lucas',
                            age: 20,
                            isAdmin: true,
                            floatValue: 1.5,
                        },
                    },
                ],
            },
        })

        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    birthDate: { notEqualTo: now },
                },
            }),
        ).toEqual({
            findManyUser: {
                edges: [
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Jeanne',
                            age: 18,
                            isAdmin: false,
                            floatValue: 2.5,
                        },
                    },
                ],
            },
        })

        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    birthDate: { lessThan: new Date(now.getTime() + 1000) },
                },
            }),
        ).toEqual({
            findManyUser: {
                edges: [
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Lucas',
                            age: 20,
                            isAdmin: true,
                            floatValue: 1.5,
                        },
                    },
                ],
            },
        })

        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    birthDate: { lessThanOrEqualTo: now },
                },
            }),
        ).toEqual({
            findManyUser: {
                edges: [
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Lucas',
                            age: 20,
                            isAdmin: true,
                            floatValue: 1.5,
                        },
                    },
                ],
            },
        })

        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    birthDate: { greaterThan: now },
                },
            }),
        ).toEqual({
            findManyUser: {
                edges: [
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Jeanne',
                            age: 18,
                            isAdmin: false,
                            floatValue: 2.5,
                        },
                    },
                ],
            },
        })

        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    birthDate: { greaterThanOrEqualTo: now },
                },
            }),
        ).toEqual({
            findManyUser: {
                edges: [
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Lucas',
                            age: 20,
                            isAdmin: true,
                            floatValue: 1.5,
                        },
                    },
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Jeanne',
                            age: 18,
                            isAdmin: false,
                            floatValue: 2.5,
                        },
                    },
                ],
            },
        })

        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    birthDate: { in: [now] },
                },
            }),
        ).toEqual({
            findManyUser: {
                edges: [
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Lucas',
                            age: 20,
                            isAdmin: true,
                            floatValue: 1.5,
                        },
                    },
                ],
            },
        })

        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    birthDate: { notIn: [now] },
                },
            }),
        ).toEqual({
            findManyUser: {
                edges: [
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Jeanne',
                            age: 18,
                            isAdmin: false,
                            floatValue: 2.5,
                        },
                    },
                ],
            },
        })
    })

    it("should support EmailScalayType's aggregation", async () => {
        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    email: { equalTo: 'lucas@mail.fr' },
                },
            }),
        ).toEqual({
            findManyUser: {
                edges: [
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Lucas',
                            age: 20,
                            isAdmin: true,
                            floatValue: 1.5,
                        },
                    },
                ],
            },
        })

        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    email: { notEqualTo: 'lucas@mail.fr' },
                },
            }),
        ).toEqual({
            findManyUser: {
                edges: [
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Jeanne',
                            age: 18,
                            isAdmin: false,
                            floatValue: 2.5,
                        },
                    },
                ],
            },
        })

        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    email: { in: ['lucas@mail.fr'] },
                },
            }),
        ).toEqual({
            findManyUser: {
                edges: [
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Lucas',
                            age: 20,
                            isAdmin: true,
                            floatValue: 1.5,
                        },
                    },
                ],
            },
        })

        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    email: { notIn: ['lucas@mail.fr'] },
                },
            }),
        ).toEqual({
            findManyUser: {
                edges: [
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Jeanne',
                            age: 18,
                            isAdmin: false,
                            floatValue: 2.5,
                        },
                    },
                ],
            },
        })
    })

    it("should support Int's aggregation", async () => {
        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    age: { equalTo: 20 },
                },
            }),
        ).toEqual({
            findManyUser: {
                edges: [
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Lucas',
                            age: 20,
                            isAdmin: true,
                            floatValue: 1.5,
                        },
                    },
                ],
            },
        })

        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    age: { notEqualTo: 20 },
                },
            }),
        ).toEqual({
            findManyUser: {
                edges: [
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Jeanne',
                            age: 18,
                            isAdmin: false,
                            floatValue: 2.5,
                        },
                    },
                ],
            },
        })

        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    age: { lessThan: 20 },
                },
            }),
        ).toEqual({
            findManyUser: {
                edges: [
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Jeanne',
                            age: 18,
                            isAdmin: false,
                            floatValue: 2.5,
                        },
                    },
                ],
            },
        })

        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    age: { lessThanOrEqualTo: 20 },
                },
            }),
        ).toEqual({
            findManyUser: {
                edges: [
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Lucas',
                            age: 20,
                            isAdmin: true,
                            floatValue: 1.5,
                        },
                    },
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Jeanne',
                            age: 18,
                            isAdmin: false,
                            floatValue: 2.5,
                        },
                    },
                ],
            },
        })

        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    age: { greaterThan: 18 },
                },
            }),
        ).toEqual({
            findManyUser: {
                edges: [
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Lucas',
                            age: 20,
                            isAdmin: true,
                            floatValue: 1.5,
                        },
                    },
                ],
            },
        })

        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    age: { greaterThanOrEqualTo: 18 },
                },
            }),
        ).toEqual({
            findManyUser: {
                edges: [
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Lucas',
                            age: 20,
                            isAdmin: true,
                            floatValue: 1.5,
                        },
                    },
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Jeanne',
                            age: 18,
                            isAdmin: false,
                            floatValue: 2.5,
                        },
                    },
                ],
            },
        })

        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    age: { in: [20] },
                },
            }),
        ).toEqual({
            findManyUser: {
                edges: [
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Lucas',
                            age: 20,
                            isAdmin: true,
                            floatValue: 1.5,
                        },
                    },
                ],
            },
        })

        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    age: { notIn: [20] },
                },
            }),
        ).toEqual({
            findManyUser: {
                edges: [
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Jeanne',
                            age: 18,
                            isAdmin: false,
                            floatValue: 2.5,
                        },
                    },
                ],
            },
        })
    })

    it("should support Boolean's aggregation", async () => {
        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    isAdmin: { equalTo: true },
                },
            }),
        ).toEqual({
            findManyUser: {
                edges: [
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Lucas',
                            age: 20,
                            isAdmin: true,
                            floatValue: 1.5,
                        },
                    },
                ],
            },
        })

        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    isAdmin: { notEqualTo: true },
                },
            }),
        ).toEqual({
            findManyUser: {
                edges: [
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Jeanne',
                            age: 18,
                            isAdmin: false,
                            floatValue: 2.5,
                        },
                    },
                ],
            },
        })

        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    isAdmin: { in: [true] },
                },
            }),
        ).toEqual({
            findManyUser: {
                edges: [
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Lucas',
                            age: 20,
                            isAdmin: true,
                            floatValue: 1.5,
                        },
                    },
                ],
            },
        })

        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    isAdmin: { notIn: [true] },
                },
            }),
        ).toEqual({
            findManyUser: {
                edges: [
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Jeanne',
                            age: 18,
                            isAdmin: false,
                            floatValue: 2.5,
                        },
                    },
                ],
            },
        })
    })

    it("should support Float's aggregation", async () => {
        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    floatValue: { equalTo: 1.5 },
                },
            }),
        ).toEqual({
            findManyUser: {
                edges: [
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Lucas',
                            age: 20,
                            isAdmin: true,
                            floatValue: 1.5,
                        },
                    },
                ],
            },
        })

        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    floatValue: { notEqualTo: 1.5 },
                },
            }),
        ).toEqual({
            findManyUser: {
                edges: [
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Jeanne',
                            age: 18,
                            isAdmin: false,
                            floatValue: 2.5,
                        },
                    },
                ],
            },
        })

        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    floatValue: { lessThan: 2.5 },
                },
            }),
        ).toEqual({
            findManyUser: {
                edges: [
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Lucas',
                            age: 20,
                            isAdmin: true,
                            floatValue: 1.5,
                        },
                    },
                ],
            },
        })

        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    floatValue: { lessThanOrEqualTo: 2.5 },
                },
            }),
        ).toEqual({
            findManyUser: {
                edges: [
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Lucas',
                            age: 20,
                            isAdmin: true,
                            floatValue: 1.5,
                        },
                    },
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Jeanne',
                            age: 18,
                            isAdmin: false,
                            floatValue: 2.5,
                        },
                    },
                ],
            },
        })

        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    floatValue: { greaterThan: 1.5 },
                },
            }),
        ).toEqual({
            findManyUser: {
                edges: [
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Jeanne',
                            age: 18,
                            isAdmin: false,
                            floatValue: 2.5,
                        },
                    },
                ],
            },
        })

        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    floatValue: { greaterThanOrEqualTo: 2.5 },
                },
            }),
        ).toEqual({
            findManyUser: {
                edges: [
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Jeanne',
                            age: 18,
                            isAdmin: false,
                            floatValue: 2.5,
                        },
                    },
                ],
            },
        })

        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    floatValue: { in: [1.5] },
                },
            }),
        ).toEqual({
            findManyUser: {
                edges: [
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Lucas',
                            age: 20,
                            isAdmin: true,
                            floatValue: 1.5,
                        },
                    },
                ],
            },
        })

        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    floatValue: { notIn: [1.5] },
                },
            }),
        ).toEqual({
            findManyUser: {
                edges: [
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Jeanne',
                            age: 18,
                            isAdmin: false,
                            floatValue: 2.5,
                        },
                    },
                ],
            },
        })
    })

    it("should support String's aggregation", async () => {
        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    name: { notEqualTo: 'Lucas' },
                },
            }),
        ).toEqual({
            findManyUser: {
                edges: [
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Jeanne',
                            age: 18,
                            isAdmin: false,
                            floatValue: 2.5,
                        },
                    },
                ],
            },
        })

        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    name: { equalTo: 'Lucas' },
                },
            }),
        ).toEqual({
            findManyUser: {
                edges: [
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Lucas',
                            age: 20,
                            isAdmin: true,
                            floatValue: 1.5,
                        },
                    },
                ],
            },
        })

        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    name: { in: ['Lucas'] },
                },
            }),
        ).toEqual({
            findManyUser: {
                edges: [
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Lucas',
                            age: 20,
                            isAdmin: true,
                            floatValue: 1.5,
                        },
                    },
                ],
            },
        })

        expect(
            await client.request<any>(graphql.findManyUser, {
                where: {
                    name: { notIn: ['Lucas'] },
                },
            }),
        ).toEqual({
            findManyUser: {
                edges: [
                    {
                        node: {
                            id: expect.any(String),
                            name: 'Jeanne',
                            age: 18,
                            isAdmin: false,
                            floatValue: 2.5,
                        },
                    },
                ],
            },
        })
    })

    it('should support OR statement', async () => {
        const { findManyUser } = await client.request<any>(
            graphql.findManyUser,
            {
                where: {
                    OR: [{ age: { equalTo: 20 } }, { age: { equalTo: 18 } }],
                },
            },
        )

        expect(findManyUser.edges).toEqual([
            {
                node: {
                    id: expect.any(String),
                    name: 'Lucas',
                    age: 20,
                    isAdmin: true,
                    floatValue: 1.5,
                },
            },
            {
                node: {
                    id: expect.any(String),
                    name: 'Jeanne',
                    age: 18,
                    isAdmin: false,
                    floatValue: 2.5,
                },
            },
        ])

        const { findManyUser: users2 } = await client.request<any>(
            graphql.findManyUser,
            {
                where: {
                    OR: [{ age: { equalTo: 20 } }, { age: { equalTo: 19 } }],
                },
            },
        )

        expect(users2.edges).toEqual([
            {
                node: {
                    id: expect.any(String),
                    name: 'Lucas',
                    age: 20,
                    isAdmin: true,
                    floatValue: 1.5,
                },
            },
        ])
    })

    it('should support AND statement', async () => {
        const { findManyUser } = await client.request<any>(
            graphql.findManyUser,
            {
                where: {
                    AND: [{ age: { equalTo: 20 } }, { age: { equalTo: 18 } }],
                },
            },
        )

        expect(findManyUser.edges).toEqual([])

        const { findManyUser: users2 } = await client.request<any>(
            graphql.findManyUser,
            {
                where: {
                    AND: [
                        { age: { equalTo: 20 } },
                        { isAdmin: { equalTo: true } },
                    ],
                },
            },
        )

        expect(users2.edges).toEqual([
            {
                node: {
                    id: expect.any(String),
                    name: 'Lucas',
                    age: 20,
                    isAdmin: true,
                    floatValue: 1.5,
                },
            },
        ])
    })
})
