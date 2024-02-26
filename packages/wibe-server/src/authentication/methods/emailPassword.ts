import { AuthenticationEventsOptions } from '../interface'

export const emailPasswordOnSignUp = async ({
	input,
	user,
	context,
}: AuthenticationEventsOptions) => {
	const fifteenMinutes = new Date(Date.now() + 15 * 60 * 1000)
	const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

	const accessToken = await context.jwt.sign({
		userId: user.id,
		iat: Date.now(),
		exp: fifteenMinutes.getTime(),
	})

	const refreshToken = await context.jwt.sign({
		userId: user.id,
		iat: Date.now(),
		exp: thirtyDays.getTime(),
	})

	const hashedPassword = await Bun.password.hash(input.password, 'argon2id')

	return {
		accessToken,
		refreshToken,
		password: hashedPassword,
		identifier: input.identifier,
	}
}

export const emailPasswordOnLogin = async ({
	input,
	user,
	context,
}: AuthenticationEventsOptions) => {
	const userDatabasePassword = user.authentication?.emailPassword?.password
	if (!userDatabasePassword)
		throw new Error('Invalid authentication credentials')

	const isPasswordEquals = await Bun.password.verify(
		input.password,
		userDatabasePassword,
		'argon2id',
	)

	if (
		!isPasswordEquals ||
		input.identifier !== user.authentication?.emailPassword?.identifier
	)
		throw new Error('Invalid authentication credentials')

	const fifteenMinutes = new Date(Date.now() + 1000 * 60 * 15)
	const thirtyDays = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)

	const accessToken = await context.jwt.sign({
		userId: user.id,
		iat: Date.now(),
		exp: fifteenMinutes.getTime(),
	})

	const refreshToken = await context.jwt.sign({
		userId: user.id,
		iat: Date.now(),
		exp: thirtyDays.getTime(),
	})

	context.cookie.access_token.add({
		value: accessToken,
		httpOnly: true,
		path: '/',
		expires: fifteenMinutes,
		// TODO : Check for implements csrf token for sub-domain protection
		sameSite: 'strict',
		secure: Bun.env.NODE_ENV === 'production',
	})

	context.cookie.refresh_token.add({
		value: refreshToken,
		httpOnly: true,
		path: '/',
		expires: thirtyDays,
		sameSite: 'strict',
		secure: Bun.env.NODE_ENV === 'production',
	})

	return {
		accessToken,
		refreshToken,
		password: userDatabasePassword,
		identifier: input.identifier,
	}
}
