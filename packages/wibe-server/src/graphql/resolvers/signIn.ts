import { gql } from 'graphql-request'
import { WibeApp } from '../../server'
import { getGraphqlClient } from '../../utils/helper'
import { Context } from '../interface'

export const signInResolver = async (
    _: any,
    {
        input: { email, password },
    }: {
        input: {
            email: string
            password: string
        }
    },
    context: Context,
) => {
    const client = getGraphqlClient(WibeApp.config.port)

    const {
        findMany_User: { edges },
    } = await client.request<any>(
        gql`
            query findMany_User($where: _UserWhereInput!) {
                findMany_User(where: $where) {
                    edges {
                        node {
                            id
                            password
                        }
                    }
                }
            }
        `,
        {
            where: {
                email: { equalTo: email },
            },
        },
    )

    if (edges.length === 0) throw new Error('User not found')

    const isPasswordEquals = await Bun.password.verify(
        password,
        edges[0].node.password,
        'argon2id',
    )

    if (!isPasswordEquals) throw new Error('User not found')

    const fifteenMinutes = new Date(Date.now() + 1000 * 60 * 15)
    const thirtyDays = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)

    const accessToken = await context.jwt.sign({
        userId: edges[0].node.id,
        iat: Date.now(),
        exp: fifteenMinutes.getTime(),
    })

    const refreshToken = await context.jwt.sign({
        userId: edges[0].node.id,
        iat: Date.now(),
        exp: thirtyDays.getTime(),
    })

    await client.request<any>(
        gql`
            mutation updateOne_User($input: _UserUpdateInput!) {
                updateOne_User(input: $input) {
                    id
                }
            }
        `,
        {
            input: {
                id: edges[0].node.id,
                fields: {
                    refreshToken,
                    accessToken,
                },
            },
        },
    )

    context.cookie.access_token.add({
        value: accessToken,
        httpOnly: true,
        path: '/',
        expires: fifteenMinutes,
        secure: Bun.env.NODE_ENV === 'production',
    })

    context.cookie.refresh_token.add({
        value: refreshToken,
        httpOnly: true,
        path: '/',
        expires: thirtyDays,
        secure: Bun.env.NODE_ENV === 'production',
    })

    return true
}
