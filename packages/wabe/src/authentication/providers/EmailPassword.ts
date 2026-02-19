import type {
	AuthenticationEventsOptions,
	AuthenticationEventsOptionsWithUserId,
	ProviderInterface,
} from '../interface'
import { contextWithRoot, verifyArgon2 } from '../../utils/export'
import type { DevWabeTypes } from '../../utils/helper'
import { clearRateLimit, isRateLimited, registerRateLimitFailure } from '../security'

type EmailPasswordInterface = {
	password: string
	email: string
	otp?: string
}

const DUMMY_PASSWORD_HASH =
	'$argon2id$v=19$m=65536,t=2,p=1$wHZB9xRS/Mbo7L3SL9e935Ag5K+T2EuT/XgB8akwZgo$SPf8EZ4T1HYkuIll4v2hSzNCH7woX3VrZJo3yWg5u8U'

export class EmailPassword implements ProviderInterface<DevWabeTypes, EmailPasswordInterface> {
	async onSignIn({
		input,
		context,
	}: AuthenticationEventsOptions<DevWabeTypes, EmailPasswordInterface>) {
		const normalizedEmail = input.email.trim().toLowerCase()
		const rateLimitKey = `emailPassword:${normalizedEmail}`

		if (isRateLimited(context, 'signIn', rateLimitKey))
			throw new Error('Invalid authentication credentials')

		const users = await context.wabe.controllers.database.getObjects({
			className: 'User',
			where: {
				authentication: {
					emailPassword: {
						email: { equalTo: input.email },
					},
				},
			},
			context: contextWithRoot(context),
			select: {
				authentication: true,
				role: true,
				secondFA: true,
				email: true,
				id: true,
				provider: true,
				isOauth: true,
				createdAt: true,
				updatedAt: true,
			},
			first: 1,
		})

		const user = users[0]
		const userDatabasePassword = user?.authentication?.emailPassword?.password

		const passwordHashToCheck = userDatabasePassword ?? DUMMY_PASSWORD_HASH

		const isPasswordEquals = await verifyArgon2(input.password, passwordHashToCheck)

		if (!user || !isPasswordEquals || input.email !== user.authentication?.emailPassword?.email) {
			throw new Error('Invalid authentication credentials')
		}

		clearRateLimit(context, 'signIn', rateLimitKey)

		return {
			user,
		}
	}

	async onSignUp({
		input,
		context,
	}: AuthenticationEventsOptions<DevWabeTypes, EmailPasswordInterface>) {
		const normalizedEmail = input.email.trim().toLowerCase()
		const rateLimitKey = `emailPassword:${normalizedEmail}`

		if (isRateLimited(context, 'signUp', rateLimitKey))
			throw new Error('Not authorized to create user')

		const users = await context.wabe.controllers.database.count({
			className: 'User',
			where: {
				authentication: {
					emailPassword: {
						email: { equalTo: input.email },
					},
				},
			},
			context: contextWithRoot(context),
		})

		// Hide real message
		if (users > 0) {
			registerRateLimitFailure(context, 'signUp', rateLimitKey)
			throw new Error('Not authorized to create user')
		}

		clearRateLimit(context, 'signUp', rateLimitKey)

		return {
			authenticationDataToSave: {
				email: input.email,
				password: input.password,
			},
		}
	}

	async onUpdateAuthenticationData({
		userId,
		input,
		context,
	}: AuthenticationEventsOptionsWithUserId<DevWabeTypes, EmailPasswordInterface>) {
		const users = await context.wabe.controllers.database.getObjects({
			className: 'User',
			where: {
				id: {
					equalTo: userId,
				},
			},
			context,
			select: { authentication: true },
		})

		if (users.length === 0) throw new Error('User not found')

		const user = users[0]

		return {
			authenticationDataToSave: {
				email: input.email ?? user?.authentication?.emailPassword?.email,
				password: input.password ? input.password : user?.authentication?.emailPassword?.password,
			},
		}
	}
}
