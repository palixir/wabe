import type { SignUpWithInput } from '../../../generated/wibe'
import type { Context } from '../../graphql/interface'
import { WibeApp } from '../../server'
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
	context: Context,
) => {
	const { provider, name } = getAuthenticationMethod<ProviderInterface>(
		Object.keys(input.authentication || {}),
	)

	const inputOfTheGoodAuthenticationMethod =
		// @ts-expect-error
		input.authentication[name]

	const { authenticationDataToSave } = await provider.onSignUp({
		input: inputOfTheGoodAuthenticationMethod,
		context,
	})

	const { id: userId } = await WibeApp.databaseController.createObject({
		className: '_User',
		data: {
			authentication: {
				[name]: {
					...authenticationDataToSave,
				},
			},
		},
		context,
	})

	const session = new Session()

	const { accessToken, refreshToken } = await session.create(userId, context)

	context.response.setCookie('refreshToken', refreshToken, {
		httpOnly: true,
		path: '/',
		secure: process.env.NODE_ENV === 'production',
		expires: new Date(Date.now() + session.getRefreshTokenExpireIn()),
	})

	context.response.setCookie('accessToken', accessToken, {
		httpOnly: true,
		path: '/',
		secure: process.env.NODE_ENV === 'production',
		expires: new Date(Date.now() + session.getAccessTokenExpireIn()),
	})

	// TODO : Need pointer on schema/resolver
	// return { accessToken, refreshToken }
	return true
}
