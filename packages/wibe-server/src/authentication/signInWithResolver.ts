import { SignInWithInput } from '../../generated/wibe'
import { Context } from '../graphql/interface'
import { WibeApp } from '../server'

const getOrCreateObjectIfNotExist = async ({
	authenticationMethod,
	inputOfTheGoodAuthenticationMethod,
	context,
}: {
	authenticationMethod: string
	inputOfTheGoodAuthenticationMethod: any
	context: Context
}) => {
	const userWithIdentifier = await WibeApp.databaseController.getObjects({
		className: '_User',
		where: {
			authentication: {
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

	if (userWithIdentifier.length === 1)
		return { user: userWithIdentifier[0], isSignUp: false }

	const user = await WibeApp.databaseController.createObject({
		className: '_User',
		data: {
			authentication: {
				[authenticationMethod]: {
					...inputOfTheGoodAuthenticationMethod,
				},
			},
		},
		context,
	})

	return { user, isSignUp: true }
}

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

	const { events } = validAuthenticationMethod

	const inputOfTheGoodAuthenticationMethod =
		// @ts-expect-error
		input.authentication[authenticationMethod]

	if (!inputOfTheGoodAuthenticationMethod.identifier)
		throw new Error('No identifier provided')

	const { user, isSignUp } = await getOrCreateObjectIfNotExist({
		authenticationMethod,
		inputOfTheGoodAuthenticationMethod,
		context,
	})

	const elementsToSave = isSignUp
		? await events.onSignUp({
				input: inputOfTheGoodAuthenticationMethod,
				context,
				user,
		  })
		: await events.onLogin({
				input: inputOfTheGoodAuthenticationMethod,
				context,
				user,
		  })

	await WibeApp.databaseController.updateObject({
		className: '_User',
		id: user.id,
		data: {
			authentication: {
				[authenticationMethod]: {
					...(elementsToSave || {}),
				},
			},
		},
		context,
	})

	return true
}
