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
			dataToStore: {
				email: {
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
			dataToStore: {
				idToken: {
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
			},
			provider: new Google(),
		},
	]
