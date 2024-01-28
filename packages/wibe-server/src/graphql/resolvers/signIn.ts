import { gql } from 'graphql-request'
import { WibeApp } from '../../server'
import { getGraphqlClient } from '../../utils/helper'
import { Context } from '../interface'

export const signInResolver = async (
    root: any,
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
        findMany_User: { objects },
    } = await client.request<any>(
        gql`
            query findMany_User($where: _UserWhereInput!) {
                findMany_User(where: $where) {
                    objects {
                        id
                        password
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

    if (objects.length === 0) throw new Error('User not found')

    const isPasswordEquals = await Bun.password.verify(
        password,
        objects[0].password,
        'argon2id',
    )

    if (!isPasswordEquals) throw new Error('User not found')

    const wibeKey = WibeApp.config.wibeKey

    const fifteenMinutes = new Date(Date.now() + 1000 * 60 * 15)
    const thirtyDays = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)

    const accessToken = await context.jwt.sign({
        userId: objects[0].id,
        iat: Date.now(),
        exp: fifteenMinutes.getTime(),
    })

    const refreshToken = await context.jwt.sign({
        userId: objects[0].id,
        iat: Date.now(),
        exp: thirtyDays.getTime(),
    })

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
