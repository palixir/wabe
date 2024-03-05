// import { getClient } from '../../utils'
// import { Context } from '../interface'

// export const signOutResolver = async (
// 	_: any,
// 	{
// 		input: { email },
// 	}: {
// 		input: {
// 			email: string
// 		}
// 	},
// 	context: Context,
// ) => {
// 	const client = getClient()

// 	const {
// 		_users: { edges },
// 	} = await client._users({ where: { email: { equalTo: email } } })

// 	if (!edges || !edges[0]) throw new Error('User not found')

// 	const user = edges[0].node

// 	await client.update_User({
// 		input: {
// 			id: user.id,
// 			fields: {
// 				refreshToken: null,
// 				accessToken: null,
// 			},
// 		},
// 	})

// 	context.cookie.access_token.remove()
// 	context.cookie.refresh_token.remove()

// 	return true
// }
