import { SignInWithInput } from '../../generated/wibe'
import { Context } from '../graphql/interface'
import { WibeApp } from '../server'
import { getClient } from '../utils'

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

	const client = getClient()

	const authenticationMethods = Object.keys(input)

	if (authenticationMethods.length > 1)
		throw new Error('Only one authentication method at the time is allowed')

	const authenticationMethod = authenticationMethods[0]

	const goodAuthenticationMethod = customAuthenticationConfig.find(
		(method) =>
			method.name.toLowerCase() === authenticationMethod.toLowerCase(),
	)

	if (!goodAuthenticationMethod)
		throw new Error('No custom authentication methods found')

	const { events } = goodAuthenticationMethod

	console.log(events)

	return true
}
