import type { Context } from '../../graphql/interface'
import { Session } from '../Session'

export const refreshResolver = async (_: any, args: any, context: Context) => {
	const {
		input: { refreshToken, accessToken },
	} = args

	const session = new Session()

	const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
		await session.refresh(accessToken, refreshToken, context)

	return { accessToken: newAccessToken, refreshToken: newRefreshToken }
}
