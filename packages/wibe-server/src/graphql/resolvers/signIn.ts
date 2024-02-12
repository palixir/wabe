import { Context } from '../interface'
import { getClient } from '../../utils'

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
	const client = getClient()

	const {
		findMany_User: { edges },
	} = await client.findMany_User({ where: { email: { equalTo: email } } })

	if (!edges || !edges[0]) throw new Error('User not found')

	const userPassword = edges[0].node.password
	if (!userPassword) throw new Error('User not found')

	const isPasswordEquals = await Bun.password.verify(
		password,
		userPassword,
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

	await client.updateOne_User({
		input: {
			id: edges[0].node.id,
			fields: {
				refreshToken,
				accessToken,
			},
		},
	})

	context.cookie.access_token.add({
		value: accessToken,
		httpOnly: true,
		path: '/',
		expires: fifteenMinutes,
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
