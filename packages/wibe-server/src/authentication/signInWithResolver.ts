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
	const validAuthentication = customAuthenticationConfig.find(
		(method) =>
			method.name.toLowerCase() === authenticationMethod.toLowerCase(),
	)

	if (!validAuthentication)
		throw new Error('No available custom authentication methods found')

	const { events } = validAuthentication

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

	if (userWithIdentifier.length === 0) {
		await WibeApp.databaseController.createObject({
			className: '_User',
			data: [
				{
					authentication: {
						[authenticationMethod]: {
							...inputOfTheGoodAuthenticationMethod,
						},
					},
				},
			],
		})

		events.onSignUp(input, context)
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
				},
			],
		})

		events.onLogin(input, context)
	}

	return true
}
