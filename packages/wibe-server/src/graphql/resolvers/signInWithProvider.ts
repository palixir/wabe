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
		_users: { edges },
	} = await client._users({ where: { email: { equalTo: email } } })

	if (edges && edges.length === 1 && edges[0]) {
		await client.update_User({
			input: {
				id: edges[0].node.id,
				fields: { email, verifiedEmail, refreshToken, accessToken },
			},
		})
	} else {
		await client.create_User({
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
