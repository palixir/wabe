import type { SignUpWithInput } from '../../../generated/wibe'
import type { Context } from '../../server/interface'
import { Session } from '../Session'
import type { ProviderInterface } from '../interface'
import { getAuthenticationMethod } from '../utils'

// 0 - Get the authentication method
// 1 - We check if the signUp is possible (call onSign)
// 2 - We create the user
// 3 - We create session
export const signUpWithResolver = async (
	_: any,
	{
		input,
	}: {
		input: SignUpWithInput
	},
	context: Context<any>,
) => {
	const { provider, name } = getAuthenticationMethod<any, ProviderInterface>(
		Object.keys(input.authentication || {}),
		context,
	)

	const inputOfTheGoodAuthenticationMethod =
		// @ts-expect-error
		input.authentication[name]

	const { authenticationDataToSave } = await provider.onSignUp({
		input: inputOfTheGoodAuthenticationMethod,
		context: {
			...context,
			isRoot: true,
		},
	})

	const { id: userId } = await context.databaseController.createObject({
		className: 'User',
		data: {
			authentication: {
				[name]: {
					...authenticationDataToSave,
				},
			},
		},
		context: {
			...context,
			isRoot: true,
		},
	})

	const session = new Session()

	const { accessToken, refreshToken } = await session.create(userId, {
		...context,
		isRoot: true,
	})

	if (context.config.authentication?.session?.cookieSession) {
		context.response?.setCookie('refreshToken', refreshToken, {
			httpOnly: true,
			path: '/',
			secure: process.env.NODE_ENV === 'production',
			expires: new Date(
				Date.now() + session.getRefreshTokenExpireIn(context.config),
			),
		})

		context.response?.setCookie('accessToken', accessToken, {
			httpOnly: true,
			path: '/',
			secure: process.env.NODE_ENV === 'production',
			expires: new Date(
				Date.now() + session.getAccessTokenExpireIn(context.config),
			),
		})
	}

	return { accessToken, refreshToken, id: userId }
}
