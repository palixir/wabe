import type { WabeContext } from '../../server/interface'
import type { DevWabeTypes } from '../../utils/helper'
import { Session } from '../Session'

export const refreshResolver = async (_: any, args: any, context: WabeContext<DevWabeTypes>) => {
	const {
		input: { refreshToken, accessToken },
	} = args

	const session = new Session<DevWabeTypes>()

	const { accessToken: newAccessToken, refreshToken: newRefreshToken } = await session.refresh(
		accessToken,
		refreshToken,
		context,
	)

	if (!newAccessToken || !newRefreshToken) throw new Error('Invalid refresh token')

	return { accessToken: newAccessToken, refreshToken: newRefreshToken }
}
