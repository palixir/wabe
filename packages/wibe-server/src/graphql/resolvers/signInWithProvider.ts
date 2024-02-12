import { AuthenticationProvider } from '../../../generated/wibe'
import { getClient } from '../../utils'

export const signInWithProviderResolver = async (
	_: any,
	{
		input: { email, verifiedEmail, provider, refreshToken, accessToken },
	}: {
		input: {
			email: string
			verifiedEmail: boolean
			provider: AuthenticationProvider
			accessToken: string
			refreshToken: string
		}
	},
) => {
	if (!verifiedEmail) throw new Error('Email not verified')

	const client = getClient()

	const {
		findMany_User: { edges },
	} = await client.findMany_User({ where: { email: { equalTo: email } } })

	if (edges && edges.length === 1 && edges[0]) {
		await client.updateOne_User({
			input: {
				id: edges[0].node.id,
				fields: { email, verifiedEmail, refreshToken, accessToken },
			},
		})
	} else {
		await client.createOne_User({
			input: {
				fields: {
					email,
					verifiedEmail,
					provider,
					refreshToken,
					accessToken,
				},
			},
		})
	}

	return true
}
