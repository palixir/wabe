import type { SignUpWithInput } from '../../../generated/wabe'
import type { WabeContext } from '../../server/interface'
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
	context: WabeContext<any>,
) => {
	// Create object call the provider signUp
	const { id: userId } =
		await context.wabeApp.controllers.database.createObject({
			className: 'User',
			data: {
				authentication: input.authentication,
			},
			context: {
				...context,
				isRoot: true,
			},
			fields: ['id'],
		})

	const session = new Session()

	const { accessToken, refreshToken } = await session.create(userId, {
		...context,
		isRoot: true,
	})

	if (context.wabeApp.config.authentication?.session?.cookieSession) {
		context.response?.setCookie('refreshToken', refreshToken, {
			httpOnly: true,
			path: '/',
			secure: process.env.NODE_ENV === 'production',
			expires: session.getRefreshTokenExpireAt(context.wabeApp.config),
		})

		context.response?.setCookie('accessToken', accessToken, {
			httpOnly: true,
			path: '/',
			secure: process.env.NODE_ENV === 'production',
			expires: session.getAccessTokenExpireAt(context.wabeApp.config),
		})
	}

	return { accessToken, refreshToken, id: userId }
}
