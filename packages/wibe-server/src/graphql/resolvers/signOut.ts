import { getClient } from '../../utils'
import { Context } from '../interface'

export const signOutResolver = async (
    _: any,
    {
        input: { email },
    }: {
        input: {
            email: string
        }
    },
    context: Context,
) => {
    const client = getClient()

    const {
        findMany_User: { edges },
    } = await client.findMany_User({ where: { email: { equalTo: email } } })

    if (!edges || !edges[0]) throw new Error('User not found')

    const user = edges[0].node

    await client.updateOne_User({
        input: {
            id: user.id,
            fields: {
                refreshToken: null,
                accessToken: null,
            },
        },
    })

    context.cookie.access_token.remove()
    context.cookie.refresh_token.remove()

    return true
}
