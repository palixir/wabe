import {
    describe,
    expect,
    it,
    beforeAll,
    afterAll,
    beforeEach,
    afterEach,
    spyOn,
} from 'bun:test'
import { GraphQLClient, gql } from 'graphql-request'
import { Cookie } from 'elysia'
import { WibeApp } from '../../server'
import { getGraphqlClient, setupTests } from '../../utils/helper'

describe('SignOut', () => {
    let wibe: WibeApp
    let port: number
    let client: GraphQLClient

    beforeAll(async () => {
        const setup = await setupTests()
        wibe = setup.wibe
        port = setup.port
        client = getGraphqlClient(port)
    })

    afterAll(async () => {
        await wibe.close()
    })

    beforeEach(async () => {
        const hashedPassword = await Bun.password.hash('passwordtest', {
            algorithm: 'argon2id', // OWASP recommandation
            memoryCost: 20000, // OWASP recommands minimum 19MB
            timeCost: 2, // OWASP recommands minimum 2 iterations
        })

        await client.request<any>(graphql.createOne_User, {
            input: {
                fields: {
                    email: 'email@test.fr',
                    password: hashedPassword,
                },
            },
        })
    })

    afterEach(async () => {
        const { findMany_User } = await client.request<any>(
            graphql.findMany_User,
            {
                where: {
                    email: { equalTo: 'email@test.fr' },
                },
            },
        )

        await Promise.all(
            findMany_User.edges.map(({ node }: { node: any }) =>
                client.request<any>(graphql.deleteOne_User, {
                    input: { id: node.id },
                }),
            ),
        )
    })

    it('should be able to sign out', async () => {
        const spyRemoveCookie = spyOn(Cookie.prototype, 'remove')

        const { signIn } = await client.request<any>(graphql.signIn, {
            input: {
                email: 'email@test.fr',
                password: 'passwordtest',
            },
        })

        const {
            findMany_User: { edges },
        } = await client.request<any>(graphql.findMany_User, {
            where: {
                email: { equalTo: 'email@test.fr' },
            },
        })

        expect(signIn).toEqual(true)

        expect(edges.length).toEqual(1)

        const { signOut } = await client.request<any>(graphql.signOut, {
            input: {
                email: 'email@test.fr',
            },
        })

        expect(signOut).toEqual(true)

        const {
            findMany_User: { edges: edges2 },
        } = await client.request<any>(graphql.findMany_User, {
            where: {
                email: { equalTo: 'email@test.fr' },
            },
        })

        expect(spyRemoveCookie).toHaveBeenCalledTimes(2)

        expect(edges2.length).toEqual(1)
        expect(edges2[0].node.email).toEqual('email@test.fr')
        expect(edges2[0].node.accessToken).toEqual(null)
        expect(edges2[0].node.refreshToken).toEqual(null)

        spyRemoveCookie.mockReset()
    })

    it('should not be able to sign out', async () => {
        const spyRemoveCookie = spyOn(Cookie.prototype, 'remove')

        expect(
            client.request<any>(graphql.signOut, {
                input: {
                    email: 'invalidemail@test.fr',
                },
            }),
        ).rejects.toThrow('User not found')

        expect(spyRemoveCookie).toHaveBeenCalledTimes(0)
    })
})

const graphql = {
    signOut: gql`
        mutation signOut($input: SignOutInput!) {
            signOut(input: $input)
        }
    `,
    signIn: gql`
        mutation signIn($input: SignInInput!) {
            signIn(input: $input)
        }
    `,
    createOne_User: gql`
        mutation createOne_User($input: _UserCreateInput!) {
            createOne_User(input: $input) {
                id
            }
        }
    `,
    findMany_User: gql`
        query findMany_User($where: _UserWhereInput) {
            findMany_User(where: $where) {
                edges {
                    node {
                        id
                        email
                        accessToken
                        refreshToken
                    }
                }
            }
        }
    `,
    deleteOne_User: gql`
        mutation deleteOne_User($input: _UserDeleteInput!) {
            deleteOne_User(input: $input) {
                id
            }
        }
    `,
}
