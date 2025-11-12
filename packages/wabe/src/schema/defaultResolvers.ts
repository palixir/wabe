import type { MutationResolver, QueryResolver } from './Schema'
import { meResolver } from './resolvers/meResolver'
import { sendEmailResolver } from './resolvers/sendEmail'
import { resetPasswordResolver } from './resolvers/resetPassword'
import { sendOtpCodeResolver } from './resolvers/sendOtpCode'

export const defaultQueries: {
	[key: string]: QueryResolver<any>
} = {
	me: {
		type: 'Object',
		outputObject: {
			name: 'MeOutput',
			fields: {
				user: {
					type: 'Pointer',
					class: 'User',
				},
			},
		},
		resolve: meResolver,
	},
}

export const defaultMutations: {
	[key: string]: MutationResolver<any>
} = {
	resetPassword: {
		type: 'Boolean',
		description: 'Mutation to reset the password of the user',
		args: {
			input: {
				password: {
					type: 'String',
					required: true,
				},
				email: {
					type: 'Email',
				},
				phone: {
					type: 'String',
				},
				otp: {
					type: 'String',
					required: true,
				},
			},
		},
		resolve: resetPasswordResolver,
	},
	sendOtpCode: {
		type: 'Boolean',
		description: 'Send an OTP code by email to the user',
		args: {
			input: {
				email: {
					type: 'Email',
					required: true,
				},
			},
		},
		resolve: sendOtpCodeResolver,
	},
	sendEmail: {
		type: 'String',
		description:
			'Send basic email with text and html, returns the id of the email',
		args: {
			input: {
				from: {
					type: 'String',
					required: true,
				},
				to: {
					type: 'Array',
					typeValue: 'String',
					required: true,
					requiredValue: true,
				},
				subject: {
					type: 'String',
					required: true,
				},
				text: {
					type: 'String',
				},
				html: {
					type: 'String',
				},
			},
		},
		resolve: sendEmailResolver,
	},
}
