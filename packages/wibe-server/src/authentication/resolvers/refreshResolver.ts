import type { WibeContext } from '../../server/interface'
import type { DevWibeAppTypes } from '../../utils/helper'
import { Session } from '../Session'

export const refreshResolver = async (
	_: any,
	args: any,
	context: WibeContext<DevWibeAppTypes>,
) => {
	const {
		input: { refreshToken, accessToken },
	} = args

	const session = new Session()

	const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
		await session.refresh(accessToken, refreshToken, context)

	return { accessToken: newAccessToken, refreshToken: newRefreshToken }
}
