import { CustomAuthenticationMethods } from './interface'
import { EmailPassword } from './providers/EmailPassword'
import { Google } from './providers/Google'

export const defaultAuthenticationMethods =
	(): CustomAuthenticationMethods[] => [
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
