import type { VerifyChallengeInput } from '../../generated/wibe'
import type { WibeContext } from '../../server/interface'
import { Session } from '../Session'
import type { SecondaryProviderInterface } from '../interface'
import { getAuthenticationMethod } from '../utils'

export const verifyChallengeResolver = async (
	_: any,
	{
		input,
	}: {
		input: VerifyChallengeInput
	},
	context: WibeContext<any>,
) => {
	if (!input.factor) throw new Error('One factor is required')

	const listOfFactor = Object.keys(input.factor)

	if (Object.keys(input.factor).length !== 1)
		throw new Error('Only one factor is allowed')

	const { provider, name } = getAuthenticationMethod<
		any,
		SecondaryProviderInterface
	>(listOfFactor, context)

	const userId = context.user?.id

	if (!userId) throw new Error('Invalid user')

	// @ts-expect-error
	const res = await provider.onVerifyChallenge(input.factor[name])

	if (!res) throw new Error('Invalid challenge')

	const session = new Session()

	await session.create(userId, context)

	return true
}
