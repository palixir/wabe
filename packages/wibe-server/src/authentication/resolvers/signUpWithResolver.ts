import type { SignUpWithInput } from '../../../generated/wibe'
import type { WibeContext } from '../../server/interface'
import { Session } from '../Session'

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
	context: WibeContext<any>,
) => {
	// Create object call the provider signUp
	const { id: userId } = await context.wibe.databaseController.createObject({
		className: 'User',
		data: {
			authentication: input.authentication,
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

	if (context.wibe.config.authentication?.session?.cookieSession) {
		context.response?.setCookie('refreshToken', refreshToken, {
			httpOnly: true,
			path: '/',
			secure: process.env.NODE_ENV === 'production',
			expires: new Date(
				Date.now() +
					session.getRefreshTokenExpireIn(context.wibe.config),
			),
		})

		context.response?.setCookie('accessToken', accessToken, {
			httpOnly: true,
			path: '/',
			secure: process.env.NODE_ENV === 'production',
			expires: new Date(
				Date.now() +
					session.getAccessTokenExpireIn(context.wibe.config),
			),
		})
	}

	return { accessToken, refreshToken, id: userId }
}
