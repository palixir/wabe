import type { WabeContext } from '../../server/interface'
import type { DevWabeTypes } from '../../utils/helper'
import { Session } from '../Session'
import { clearRateLimit, isRateLimited, registerRateLimitFailure } from '../security'

export const refreshResolver = async (_: any, args: any, context: WabeContext<DevWabeTypes>) => {
	const {
		input: { refreshToken, accessToken },
	} = args

	// Throttle refresh attempts to prevent brute-forcing/abusing refresh tokens. The key is derived
	// from the presented refresh token so a stolen/guessed token can't be hammered indefinitely.
	const rateLimitKey = refreshToken || accessToken || 'unknown'
	if (isRateLimited(context, 'refresh', rateLimitKey))
		throw new Error('Too many attempts. Please try again later.')

	const session = new Session<DevWabeTypes>()

	let newAccessToken: string | undefined
	let newRefreshToken: string | undefined

	try {
		const result = await session.refresh(accessToken, refreshToken, context)
		newAccessToken = result.accessToken ?? undefined
		newRefreshToken = result.refreshToken ?? undefined
	} catch (error) {
		registerRateLimitFailure(context, 'refresh', rateLimitKey)
		throw error
	}

	if (!newAccessToken || !newRefreshToken) {
		registerRateLimitFailure(context, 'refresh', rateLimitKey)
		throw new Error('Invalid refresh token')
	}

	clearRateLimit(context, 'refresh', rateLimitKey)

	return { accessToken: newAccessToken, refreshToken: newRefreshToken }
}
