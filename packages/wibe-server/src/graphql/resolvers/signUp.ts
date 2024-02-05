import { Context } from '../interface'
import { getClient } from '../../utils'

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
    const client = getClient()

    const {
        findMany_User: { edges },
    } = await client.findMany_User({ where: { email: { equalTo: email } } })

    if (edges && edges.length > 0) throw new Error('User already exist')

    // TODO : Add possibility to configure the password length and check if the length is correct
    const hashedPassword = await Bun.password.hash(password, 'argon2id')

    const fifteenMinutes = new Date(Date.now() + 1000 * 60 * 15)
    const thirtyDays = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)

    const { createOne_User: user } = await client.createOne_User({
        input: {
            fields: {
                email,
                password: hashedPassword,
            },
        },
    })

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

    await client.updateOne_User({
        input: { id: user.id, fields: { refreshToken, accessToken } },
    })

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
