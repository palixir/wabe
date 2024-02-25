import { CustomAuthenticationMethods } from './interface'
import { emailPasswordOnLogin } from './methods/emailPassword'

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
		},
		events: {
			onLogin: emailPasswordOnLogin,
			onSignUp: () => Promise.resolve({}),
		},
	},
]
