import { WibeApp } from '../..'
import type { SignInWithInput } from '../../../generated/wibe'
import type { Context } from '../../graphql/interface'
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
	context: Context,
) => {
	const { provider, name } = getAuthenticationMethod<ProviderInterface>(
		Object.keys(input.authentication || {}),
	)

	const inputOfTheGoodAuthenticationMethod =
		// @ts-expect-error
		input.authentication[name]

	// 1 - We call the onSignIn method of the provider
	const { user } = await provider.onSignIn({
		input: inputOfTheGoodAuthenticationMethod,
		context,
	})

	const userId = user.id

	if (!userId) throw new Error('Authentication failed')

	// 2 - We call the onSendChallenge method of the provider
	if (input.authentication?.secondaryFactor) {
		const secondaryProvider =
			getAuthenticationMethod<SecondaryProviderInterface>([
				input.authentication.secondaryFactor,
			])

		await secondaryProvider.provider.onSendChallenge()

		return { accessToken: null, refreshToken: null, id: userId }
	}

	const session = new Session()

	const { refreshToken, accessToken } = await session.create(userId, context)

	if (WibeApp.config.authentication?.session?.cookieSession) {
		context.response?.setCookie('refreshToken', refreshToken, {
			httpOnly: true,
			path: '/',
			secure: process.env.NODE_ENV === 'production',
			expires: new Date(Date.now() + session.getRefreshTokenExpireIn()),
		})

		context.response?.setCookie('accessToken', accessToken, {
			httpOnly: true,
			path: '/',
			secure: process.env.NODE_ENV === 'production',
			expires: new Date(Date.now() + session.getAccessTokenExpireIn()),
		})
	}

	return { accessToken, refreshToken, id: userId }
}
