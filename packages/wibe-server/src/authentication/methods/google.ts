import { AuthenticationEventsOptions } from '../interface'

export const googleOnSignInOrSignUp = async ({
	input,
	context,
}: AuthenticationEventsOptions) => {
	const { accessToken, refreshToken, email, verifiedEmail, identifier } =
		input

	const fifteenMinutes = new Date(Date.now() + 1000 * 60 * 15)
	const thirtyDays = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)

	// Create cookie for access and refresh token
	context.cookie.accessToken.add({
		value: accessToken,
		httpOnly: true,
		path: '/',
		// TODO : Check for implements csrf token for sub-domain protection
		sameSite: 'strict',
		expires: fifteenMinutes,
		secure: Bun.env.NODE_ENV === 'production',
	})

	context.cookie.refreshToken.add({
		value: refreshToken,
		httpOnly: true,
		path: '/',
		// TODO : Check for implements csrf token for sub-domain protection
		sameSite: 'strict',
		expires: thirtyDays,
		secure: Bun.env.NODE_ENV === 'production',
	})

	return {
		identifier,
		accessToken,
		refreshToken,
		email,
		verifiedEmail,
	}
}
