import type { SignUpWithInput } from '../../../generated/wabe'
import type { WabeContext } from '../../server/interface'
import { getSessionCookieSameSite } from '../cookies'
import { Session } from '../Session'
import type { ProviderInterface } from '../interface'
import { getAuthenticationMethod } from '../utils'
import type { DevWabeTypes } from '../../utils/helper'

// 0 - Get the authentication method
// 1 - We check if the signUp is possible (call onSignUp)
// 2 - We create the user
// 3 - We create session
export const signUpWithResolver = async (
	_: any,
	{
		input,
	}: {
		input: SignUpWithInput
	},
	context: WabeContext<DevWabeTypes>,
) => {
	if (context.wabe.config.authentication?.disableSignUp) throw new Error('SignUp is disabled')

	const { provider, name } = getAuthenticationMethod<DevWabeTypes, ProviderInterface<DevWabeTypes>>(
		Object.keys(input.authentication || {}),
		context,
	)

	const inputOfTheGoodAuthenticationMethod =
		// @ts-expect-error
		input.authentication[name]

	const { authenticationDataToSave, challengeToken } = await provider.onSignUp({
		input: inputOfTheGoodAuthenticationMethod,
		context,
	})

	if (challengeToken) {
		return {
			id: null,
			accessToken: null,
			refreshToken: null,
			challengeToken,
		}
	}

	const res = await context.wabe.controllers.database.createObject({
		className: 'User',
		data: {
			authentication: {
				[name]: authenticationDataToSave,
			},
		},
		context,
		select: { id: true },
		_skipAuthenticationSignUpHook: true,
	})

	const createdUserId = res?.id

	const session = new Session<DevWabeTypes>()

	if (!createdUserId) throw new Error('User not created')

	const { accessToken, refreshToken, csrfToken } = await session.create(createdUserId, context)

	if (context.wabe.config.authentication?.session?.cookieSession) {
		const sameSite = getSessionCookieSameSite(context.wabe.config)

		context.response?.setCookie('refreshToken', refreshToken, {
			httpOnly: true,
			path: '/',
			sameSite,
			secure: true,
			expires: session.getRefreshTokenExpireAt(context.wabe.config),
		})

		context.response?.setCookie('accessToken', accessToken, {
			httpOnly: true,
			path: '/',
			sameSite,
			secure: true,
			expires: session.getAccessTokenExpireAt(context.wabe.config),
		})

		context.response?.setCookie('csrfToken', csrfToken, {
			httpOnly: false, // OWASP specification specify that the csrfToken should not be httpOnly
			path: '/',
			sameSite,
			secure: true,
			expires: session.getAccessTokenExpireAt(context.wabe.config),
		})
	}

	return { accessToken, refreshToken, id: createdUserId, challengeToken: null }
}
