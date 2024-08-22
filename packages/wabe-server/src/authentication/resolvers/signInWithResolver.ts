import type { SignInWithInput } from '../../../generated/wabe'
import type { WabeContext } from '../../server/interface'
import type { DevWabeAppTypes } from '../../utils/helper'
import { Session } from '../Session'
import type {
	ProviderInterface,
	SecondaryProviderInterface,
} from '../interface'
import { getAuthenticationMethod } from '../utils'

// 0 - Get the authentication method
// 1 - We check if the signIn is possible (call onSign)
// 2 - If secondaryFactor is present, we call the onSendChallenge method of the provider
// 3 - We create session
export const signInWithResolver = async (
	_: any,
	{
		input,
	}: {
		input: SignInWithInput
	},
	context: WabeContext<DevWabeAppTypes>,
) => {
	const { provider, name } = getAuthenticationMethod<
		DevWabeAppTypes,
		ProviderInterface
	>(Object.keys(input.authentication || {}), context)

	const inputOfTheGoodAuthenticationMethod =
		// @ts-expect-error
		input.authentication[name]

	// 1 - We call the onSignIn method of the provider
	const { user, oauth } = await provider.onSignIn({
		input: inputOfTheGoodAuthenticationMethod,
		context,
	})

	const userId = user.id

	if (!userId) throw new Error('Authentication failed')

	// 2 - We call the onSendChallenge method of the provider
	if (input.authentication?.secondaryFactor) {
		const secondaryProvider = getAuthenticationMethod<
			DevWabeAppTypes,
			SecondaryProviderInterface
		>([input.authentication.secondaryFactor], context)

		await secondaryProvider.provider.onSendChallenge()

		return { accessToken: null, refreshToken: null, id: userId }
	}

	const getRefreshAndAccessToken = async () => {
		if (user.isOauth && oauth) return oauth

		const session = new Session()

		const { refreshToken, accessToken } = await session.create(
			userId,
			context,
		)

		return {
			refreshToken,
			accessToken,
			accessTokenExpiresAt: session.getAccessTokenExpireAt(
				context.wabeApp.config,
			),
			refreshTokenExpiresAt: session.getRefreshTokenExpireAt(
				context.wabeApp.config,
			),
		}
	}

	const {
		accessToken,
		refreshToken,
		accessTokenExpiresAt,
		refreshTokenExpiresAt,
	} = await getRefreshAndAccessToken()

	if (context.wabeApp.config.authentication?.session?.cookieSession) {
		context.response?.setCookie('refreshToken', refreshToken, {
			httpOnly: true,
			path: '/',
			secure: process.env.NODE_ENV === 'production',
			expires: refreshTokenExpiresAt,
		})

		context.response?.setCookie('accessToken', accessToken, {
			httpOnly: true,
			path: '/',
			secure: process.env.NODE_ENV === 'production',
			expires: accessTokenExpiresAt,
		})
	}

	return { accessToken, refreshToken, id: userId }
}
