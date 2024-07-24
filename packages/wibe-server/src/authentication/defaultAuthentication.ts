import { Google, type WibeAppTypes } from '..'
import type { CustomAuthenticationMethods } from './interface'
import { EmailPassword } from './providers/EmailPassword'

export const defaultAuthenticationMethods = <
	T extends WibeAppTypes,
>(): CustomAuthenticationMethods<T>[] => [
	{
		name: 'emailPassword',
		input: {
			email: {
				type: 'Email',
				required: true,
			},
			password: {
				type: 'String',
				required: true,
			},
		},
		provider: new EmailPassword(),
	},
	{
		name: 'google',
		input: {
			authorizationCode: {
				type: 'String',
				required: true,
			},
			codeVerifier: {
				type: 'String',
				required: true,
			},
		},
		provider: new Google(),
	},
]
