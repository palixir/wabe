import { SignInWithInput } from '../../generated/wibe'
import { Context } from '../graphql/interface'
import { WibeApp } from '../server'

export const signInWithResolver = async (
	_: any,
	{
		input,
	}: {
		input: SignInWithInput
	},
	context: Context,
) => {
	const customAuthenticationConfig =
		WibeApp.config.authentication?.customAuthenticationMethods

	if (!customAuthenticationConfig)
		throw new Error('No custom authentication methods found')

	const authenticationMethods = Object.keys(input.authentication || {})

	// We check if the client don't use multiple authentication methods at the same time
	if (authenticationMethods.length > 1)
		throw new Error('Only one authentication method at the time is allowed')

	const authenticationMethod = authenticationMethods[0]

	// We check if the authentication method is valid
	const validAuthenticationMethod = customAuthenticationConfig.find(
		(method) =>
			method.name.toLowerCase() === authenticationMethod.toLowerCase(),
	)

	if (!validAuthenticationMethod)
		throw new Error('No available custom authentication methods found')

	const { events } = validAuthenticationMethod

	const inputOfTheGoodAuthenticationMethod =
		// @ts-expect-error
		input.authentication[authenticationMethod]

	if (!inputOfTheGoodAuthenticationMethod.identifier)
		throw new Error('No identifier provided')

	// We need to use directly the databaseController because
	// we don't know the type of the identifier (email, phone, username, etc.)
	// So we can't use graphql api
	const userWithIdentifier = await WibeApp.databaseController.getObjects({
		className: '_User',
		where: {
			authentication: {
				// @ts-expect-error
				[authenticationMethod]: {
					identifier: {
						equalTo: inputOfTheGoodAuthenticationMethod.identifier,
					},
				},
			},
		},
	})

	if (userWithIdentifier.length > 1)
		throw new Error('Multiple users found with the same identifier')

	const isSignUp = userWithIdentifier.length === 0

	const { accessToken, refreshToken } = isSignUp
		? await events.onSignUp(input, context)
		: await events.onLogin(input, context)

	if (isSignUp) {
		await WibeApp.databaseController.createObject({
			className: '_User',
			data: [
				{
					authentication: {
						[authenticationMethod]: {
							...inputOfTheGoodAuthenticationMethod,
						},
					},
					accessToken,
					refreshToken,
				},
			],
		})
	} else {
		await WibeApp.databaseController.updateObject({
			className: '_User',
			id: userWithIdentifier[0].id,
			data: [
				{
					authentication: {
						[authenticationMethod]: {
							...inputOfTheGoodAuthenticationMethod,
						},
					},
					accessToken,
					refreshToken,
				},
			],
		})
	}

	if (accessToken) {
		const fifteenMinutes = new Date(Date.now() + 1000 * 60 * 15)
		context.cookie.access_token.add({
			value: accessToken,
			httpOnly: true,
			path: '/',
			expires: fifteenMinutes,
			// TODO : Check for implements csrf token for sub-domain protection
			sameSite: 'strict',
			secure: Bun.env.NODE_ENV === 'production',
		})
	}

	if (refreshToken) {
		const thirtyDays = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)

		context.cookie.refresh_token.add({
			value: refreshToken,
			httpOnly: true,
			path: '/',
			expires: thirtyDays,
			sameSite: 'strict',
			secure: Bun.env.NODE_ENV === 'production',
		})
	}

	return true
}
