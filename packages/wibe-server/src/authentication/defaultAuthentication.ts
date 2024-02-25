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
]
