import { gql } from 'graphql-request'
import { WibeApp } from '../../server'
import { getGraphqlClient } from '../../utils/helper'
import { Context } from '../interface'

export const signUpResolver = async (
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

    if (edges.length > 0) throw new Error('User already exist')

    // TODO : Add possibility to configure the password lenght and check if the lenght is correct
    const hashedPassword = await Bun.password.hash(password, 'argon2id')

    const fifteenMinutes = new Date(Date.now() + 1000 * 60 * 15)
    const thirtyDays = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)

    const { createOne_User: user } = await client.request<any>(
        gql`
            mutation createOne_User($input: _UserCreateInput!) {
                createOne_User(input: $input) {
                    id
                }
            }
        `,
        {
            input: {
                fields: {
                    email,
                    password: hashedPassword,
                },
            },
        },
    )

    const accessToken = await context.jwt.sign({
        userId: user.id,
        iat: Date.now(),
        exp: fifteenMinutes.getTime(),
    })

    const refreshToken = await context.jwt.sign({
        userId: user.id,
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
                id: user.id,
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
        // TODO : Check for implements csrf token for sub-domain protection
        sameSite: 'strict',
        secure: Bun.env.NODE_ENV === 'production',
    })

    context.cookie.refresh_token.add({
        value: refreshToken,
        httpOnly: true,
        path: '/',
        expires: thirtyDays,
        sameSite: 'strict',
        secure: Bun.env.NODE_ENV === 'production',
    })

    return true
}
