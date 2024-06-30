import type { Context } from '../../server/interface'
import type { DevWibeAppTypes } from '../../utils/helper'
import { Session } from '../Session'

export const refreshResolver = async (
	_: any,
	args: any,
	context: Context<DevWibeAppTypes>,
) => {
	const {
		input: { refreshToken, accessToken },
	} = args

	const session = new Session()

	const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
		await session.refresh(accessToken, refreshToken, context)

	return { accessToken: newAccessToken, refreshToken: newRefreshToken }
}
