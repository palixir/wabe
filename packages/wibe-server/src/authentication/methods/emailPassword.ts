import { WibeApp } from '../../server'
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

	return {
		accessToken,
		refreshToken,
		password: 'password',
		identifier: 'email@test.fr',
	}
}

export const emailPasswordOnLogin = async ({
	input,
	user,
	context,
}: AuthenticationEventsOptions) => {
	const databaseUserPassword = user.authentication?.emailPassword?.password
	const inputPasword = input.authentication.emailPassword.password

	if (databaseUserPassword !== inputPasword)
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
		password: 'password',
		identifier: 'email@test.fr',
	}
}
