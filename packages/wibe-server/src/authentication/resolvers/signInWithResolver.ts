import { SignInWithInput } from '../../../generated/wibe'
import { Context } from '../../graphql/interface'
import { WibeApp } from '../../server'

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
	if (authenticationMethods.length > 1 || authenticationMethods.length === 0)
		throw new Error('Only one authentication method at the time is allowed')

	const authenticationMethod = authenticationMethods[0]

	// We check if the authentication method is valid
	const validAuthenticationMethod = customAuthenticationConfig.find(
		(method) =>
			method.name.toLowerCase() === authenticationMethod.toLowerCase(),
	)

	if (!validAuthenticationMethod)
		throw new Error('No available custom authentication methods found')

	const { provider } = validAuthenticationMethod

	const inputOfTheGoodAuthenticationMethod =
		// @ts-expect-error
		input.authentication[authenticationMethod]

	const { dataToStore, user } = await provider.onSignIn({
		input: inputOfTheGoodAuthenticationMethod,
		context,
	})

	if (!user.id) throw new Error('Authentication failed')

	await WibeApp.databaseController.updateObject({
		className: '_User',
		id: user.id,
		data: {
			authentication: {
				[authenticationMethod]: {
					...(dataToStore || {}),
				},
			},
		},
		context,
	})

	return true
}
