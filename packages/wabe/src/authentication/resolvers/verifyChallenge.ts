import type { VerifyChallengeInput } from '../../../generated/wabe'
import type { WabeContext } from '../../server/interface'
import type { DevWabeTypes } from '../../utils/helper'
import { Session } from '../Session'
import type { SecondaryProviderInterface } from '../interface'
import { getAuthenticationMethod } from '../utils'

export const verifyChallengeResolver = async (
	_: any,
	{
		input,
	}: {
		input: VerifyChallengeInput
	},
	context: WabeContext<DevWabeTypes>,
) => {
	if (!input.secondFA) throw new Error('One factor is required')

	const listOfFactor = Object.keys(input.secondFA)

	if (listOfFactor.length > 1) throw new Error('Only one factor is allowed')

	const { provider, name } = getAuthenticationMethod<any, SecondaryProviderInterface<DevWabeTypes>>(
		listOfFactor,
		context,
	)

	const result = await provider.onVerifyChallenge({
		context,
		// @ts-expect-error
		input: input.secondFA[name],
	})

	if (!result?.userId) throw new Error('Invalid challenge')

	const session = new Session()

	const { accessToken, refreshToken } = await session.create(result.userId, context)

	if (context.wabe.config.authentication?.session?.cookieSession) {
		const accessTokenExpiresAt = session.getAccessTokenExpireAt(context.wabe.config)
		const refreshTokenExpiresAt = session.getRefreshTokenExpireAt(context.wabe.config)

		context.response?.setCookie('refreshToken', refreshToken, {
			httpOnly: true,
			path: '/',
			sameSite: 'None',
			secure: true,
			expires: refreshTokenExpiresAt,
		})

		context.response?.setCookie('accessToken', accessToken, {
			httpOnly: true,
			path: '/',
			sameSite: 'None',
			secure: true,
			expires: accessTokenExpiresAt,
		})
	}

	return { accessToken, srp: result.srp }
}
