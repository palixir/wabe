import { SignInWithInput } from '../../generated/wibe'
import { Context } from '../graphql/interface'
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
	const client = getClient()

	const authenticationMethods = Object.keys(input)

	if (authenticationMethods.length > 1)
		throw new Error('Only one authentication method at the time is allowed')

	const authenticationMethod = authenticationMethods[0]

	switch (authenticationMethod) {
		case 'emailPassword': {
			break
		}
		default:
			throw new Error('Invalid authentication method')
	}

	return true
}
