import { VerifyChallengeInput } from '../../../generated/wibe'
import { Context } from '../../graphql/interface'
import { Session } from '../Session'
import { SecondaryProviderInterface } from '../interface'
import { getAuthenticationMethod } from '../utils'

export const verifyChallengeResolver = async (
	_: any,
	{
		input,
	}: {
		input: VerifyChallengeInput
	},
	context: Context,
) => {
	if (!input.factor) throw new Error('One factor is required')

	const listOfFactor = Object.keys(input.factor)

	if (Object.keys(input.factor).length !== 1)
		throw new Error('Only one factor is allowed')

	const { provider, name } =
		getAuthenticationMethod<SecondaryProviderInterface>(listOfFactor)

	// @ts-expect-error
	const res = await provider.onVerifyChallenge(input.factor[name])

	if (!res) throw new Error('Invalid challenge')

	const session = new Session()

	await session.create(context.user.id, context)

	return true
}
