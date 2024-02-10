import { describe, expect, it, beforeAll, afterAll } from 'bun:test'
import { GraphQLClient, gql } from 'graphql-request'
import { closeTests, getGraphqlClient, setupTests } from '../utils/helper'
import { WibeApp } from '..'

describe('Default hooks', () => {
    let wibe: WibeApp
    let port: number
    let client: GraphQLClient

    const now = new Date()

    beforeAll(async () => {
        const setup = await setupTests()
        wibe = setup.wibe
        port = setup.port
        client = getGraphqlClient(port)
    })

    afterAll(() => {
        closeTests(wibe)
    })

    describe('CreatedAt and UpdatedAt', () => {
        it('should add createdAt value', async () => {
            const { createOne_User } = await client.request<any>(
                graphql.createOne_User,
                {
                    input: {
                        fields: {
                            email: 'email@test.fr',
                        },
                    },
                },
            )

            const createdAt = new Date(createOne_User.createdAt)

            // Don't test hours to avoid flaky
            expect(createdAt.getDay()).toEqual(now.getDay())
            expect(createdAt.getMonth()).toEqual(now.getMonth())
            expect(createdAt.getFullYear()).toEqual(now.getFullYear())

            expect(createOne_User.updatedAt).toBeNull()
        })

        it('shoud add updatedAt value', async () => {
            const { createOne_User } = await client.request<any>(
                graphql.createOne_User,
                {
                    input: {
                        fields: {
                            email: 'email@test.fr',
                        },
                    },
                },
            )

            const { updateOne_User } = await client.request<any>(
                graphql.updateOne_User,
                {
                    input: {
                        id: createOne_User.id,
                        fields: {
                            email: 'email2@test.fr',
                        },
                    },
                },
            )

            const updatedAt = new Date(updateOne_User.updatedAt)

            // Don't test hours to avoid flaky
            expect(updatedAt.getDay()).toEqual(now.getDay())
            expect(updatedAt.getMonth()).toEqual(now.getMonth())
            expect(updatedAt.getFullYear()).toEqual(now.getFullYear())
        })
    })
})

const graphql = {
    createOne_User: gql`
        mutation createUser($input: _UserCreateInput!) {
            createOne_User(input: $input) {
                id
                createdAt
                updatedAt
            }
        }
    `,
    updateOne_User: gql`
        mutation updateUser($input: _UserUpdateInput!) {
            updateOne_User(input: $input) {
                id
                createdAt
                updatedAt
            }
        }
    `,
}
