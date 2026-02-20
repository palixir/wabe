import type {
	AuthenticationEventsOptions,
	AuthenticationEventsOptionsWithUserId,
	ProviderInterface,
} from '../interface'
import { contextWithRoot, verifyArgon2 } from '../../utils/export'
import type { DevWabeTypes } from '../../utils/helper'
import { clearRateLimit, isRateLimited, registerRateLimitFailure } from '../security'

const DUMMY_PASSWORD_HASH =
	'$argon2id$v=19$m=65536,t=2,p=1$wHZB9xRS/Mbo7L3SL9e935Ag5K+T2EuT/XgB8akwZgo$SPf8EZ4T1HYkuIll4v2hSzNCH7woX3VrZJo3yWg5u8U'

type PhonePasswordInterface = {
	password: string
	phone: string
	otp?: string
}

export class PhonePassword implements ProviderInterface<DevWabeTypes, PhonePasswordInterface> {
	async onSignIn({
		input,
		context,
	}: AuthenticationEventsOptions<DevWabeTypes, PhonePasswordInterface>) {
		const normalizedPhone = input.phone.trim().toLowerCase()
		const rateLimitKey = `phonePassword:${normalizedPhone}`

		if (isRateLimited(context, 'signIn', rateLimitKey))
			throw new Error('Invalid authentication credentials')

		const users = await context.wabe.controllers.database.getObjects({
			className: 'User',
			where: {
				authentication: {
					phonePassword: {
						phone: { equalTo: normalizedPhone },
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
		const userDatabasePassword = user?.authentication?.phonePassword?.password

		const passwordHashToCheck = userDatabasePassword ?? DUMMY_PASSWORD_HASH

		const isPasswordEquals = await verifyArgon2(input.password, passwordHashToCheck)

		if (
			!user ||
			!isPasswordEquals ||
			normalizedPhone !== user.authentication?.phonePassword?.phone
		) {
			registerRateLimitFailure(context, 'signIn', rateLimitKey)
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
	}: AuthenticationEventsOptions<DevWabeTypes, PhonePasswordInterface>) {
		const normalizedPhone = input.phone.trim().toLowerCase()
		const rateLimitKey = `phonePassword:${normalizedPhone}`

		if (isRateLimited(context, 'signUp', rateLimitKey))
			throw new Error('Not authorized to create user')

		const users = await context.wabe.controllers.database.count({
			className: 'User',
			where: {
				authentication: {
					phonePassword: {
						phone: { equalTo: normalizedPhone },
					},
				},
			},
			context: contextWithRoot(context),
		})

		if (users > 0) {
			registerRateLimitFailure(context, 'signUp', rateLimitKey)
			throw new Error('Not authorized to create user')
		}

		clearRateLimit(context, 'signUp', rateLimitKey)

		return {
			authenticationDataToSave: {
				phone: normalizedPhone,
				password: input.password,
			},
		}
	}

	async onUpdateAuthenticationData({
		userId,
		input,
		context,
	}: AuthenticationEventsOptionsWithUserId<DevWabeTypes, PhonePasswordInterface>) {
		const normalizedPhone = input.phone.trim().toLowerCase()
		const user = await context.wabe.controllers.database.getObject({
			className: 'User',
			id: userId,
			context: contextWithRoot(context),
			select: { authentication: true },
		})

		if (!user) throw new Error('User not found')

		return {
			authenticationDataToSave: {
				phone: normalizedPhone ?? user?.authentication?.phonePassword?.phone,
				password: input.password ? input.password : user?.authentication?.phonePassword?.password,
			},
		}
	}
}
