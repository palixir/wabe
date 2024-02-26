import { CustomAuthenticationMethods } from './interface'
import {
	emailPasswordOnLogin,
	emailPasswordOnSignUp,
} from './methods/emailPassword'

export const defaultAuthenticationMethods: CustomAuthenticationMethods[] = [
	{
		name: 'emailPassword',
		input: {
			identifier: {
				type: 'Email',
				required: true,
			},
			password: {
				type: 'String',
				required: true,
			},
			accessToken: {
				type: 'String',
			},
			refreshToken: {
				type: 'String',
			},
		},
		events: {
			onLogin: emailPasswordOnLogin,
			onSignUp: emailPasswordOnSignUp,
		},
	},
	{
		name: 'google',
		input: {
			// For google identifier is the id_token
			identifier: {
				type: 'String',
				required: true,
			},
			email: {
				type: 'Email',
				required: true,
			},
			verifiedEmail: {
				type: 'Boolean',
				required: true,
			},
			accessToken: {
				type: 'String',
			},
			refreshToken: {
				type: 'String',
			},
			// Don't store the authorization code just use it in input to pass to the graphql mutation
			authorizationCode: {
				type: 'String',
			},
		},
		events: {
			onLogin: async () => {},
			onSignUp: async () => {},
		},
	},
]
