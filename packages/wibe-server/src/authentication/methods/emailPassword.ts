import { AuthenticationEventsOptions } from '../interface'

export const emailPasswordOnLogin = async ({
	userId,
	context,
}: AuthenticationEventsOptions) => {
	const fifteenMinutes = new Date(Date.now() + 15 * 60 * 1000)
	const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

	const accessToken = await context.jwt.sign({
		userId: userId,
		iat: Date.now(),
		exp: fifteenMinutes.getTime(),
	})

	const refreshToken = await context.jwt.sign({
		userId: userId,
		iat: Date.now(),
		exp: thirtyDays.getTime(),
	})

	return { accessToken, refreshToken }
}
