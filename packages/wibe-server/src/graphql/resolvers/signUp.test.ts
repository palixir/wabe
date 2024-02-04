import {
    describe,
    expect,
    it,
    beforeAll,
    afterAll,
    afterEach,
    spyOn,
} from 'bun:test'
import { Cookie } from 'elysia'
import { GraphQLClient, gql } from 'graphql-request'
import { getGraphqlClient, setupTests } from '../../utils/helper'
import { WibeApp } from '../../server'

describe('SignUp', () => {
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

    afterEach(async () => {
        const { findMany_User } = await client.request(
            graphql.findMany_User,
            {},
        )

        await Promise.all(
            findMany_User.edges.map(({ node }: { node: any }) =>
                client.request(graphql.deleteOne_User, {
                    input: { id: node.id },
                }),
            ),
        )
    })

    it('should be able to signUp an user', async () => {
        const spySetCookie = spyOn(Cookie.prototype, 'add')

        const { signUp } = await client.request(graphql.signUp, {
            input: {
                email: 'email@test.fr',
                password: 'passwordtest',
            },
        })

        expect(signUp).toEqual(true)

        const { findMany_User: users } = await client.request(
            graphql.findMany_User,
            {
                where: {
                    email: { equalTo: 'email@test.fr' },
                },
            },
        )

        const isPasswordEquals = await Bun.password.verify(
            'passwordtest',
            users.edges[0].node.password,
            'argon2id',
        )

        expect(users.edges.length).toEqual(1)
        expect(users.edges[0].node.email).toEqual('email@test.fr')
        expect(isPasswordEquals).toEqual(true)

        expect(spySetCookie).toHaveBeenCalledTimes(2)
        expect(spySetCookie).toHaveBeenNthCalledWith(1, {
            expires: expect.any(Date),
            httpOnly: true,
            path: '/',
            value: expect.any(String),
            sameSite: 'strict',
            secure: false,
        })

        expect(spySetCookie).toHaveBeenNthCalledWith(2, {
            expires: expect.any(Date),
            httpOnly: true,
            path: '/',
            value: expect.any(String),
            sameSite: 'strict',
            secure: false,
        })

        spySetCookie.mockReset()
    })

    it('should not be able to signUp an user with an email already exist', async () => {
        const spySetCookie = spyOn(Cookie.prototype, 'add')

        const { signUp } = await client.request(graphql.signUp, {
            input: {
                email: 'email@test.fr',
                password: 'passwordtest',
            },
        })

        expect(signUp).toEqual(true)

        spySetCookie.mockReset()

        expect(
            client.request(graphql.signUp, {
                input: {
                    email: 'email@test.fr',
                    password: 'passwordtest',
                },
            }),
        ).rejects.toThrow('User already exist')

        expect(spySetCookie).toHaveBeenCalledTimes(0)
    })
})

const graphql = {
    findMany_User: gql`
        query findMany_User($where: _UserWhereInput) {
            findMany_User(where: $where) {
                edges {
                    node {
                        id
                        email
                        password
                        accessToken
                        refreshToken
                    }
                }
            }
        }
    `,
    signUp: gql`
        mutation signUp($input: SignUpInput!) {
            signUp(input: $input)
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
