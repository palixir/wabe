import type { WabeContext } from '../../server/interface'
import { contextWithRoot } from '../../utils/export'
import { normalizeEmail } from '../../utils/email'
import type { DevWabeTypes } from '../../utils/helper'
import { type AuthenticationEventsOptions, AuthenticationProvider } from '../interface'
import { AuthenticationProvider as AuthenticationProviderEnum } from '../../../generated/wabe'
import { Google } from '../oauth'
import { GitHub } from '../oauth/GitHub'

export type OAuthAuthenticationInterface = {
	authorizationCode: string
	codeVerifier: string
}

const oauthUserSelect = {
	authentication: true,
	role: true,
	secondFA: true,
	email: true,
	id: true,
	provider: true,
	isOauth: true,
	createdAt: true,
	updatedAt: true,
} as const

const getProviderUserId = (providerUserId: unknown) => {
	if (typeof providerUserId === 'string' && providerUserId.trim().length > 0)
		return providerUserId.trim()

	if (typeof providerUserId === 'number') return String(providerUserId)

	return null
}

export const getProvider = (
	context: WabeContext<DevWabeTypes>,
	provider: AuthenticationProvider,
) => {
	const config = context.wabe.config

	switch (provider) {
		case AuthenticationProvider.Google:
			return new Google(config)
		case AuthenticationProvider.GitHub:
			return new GitHub(config)
		default:
			throw new Error(`Provider ${provider} not found`)
	}
}

export const oAuthAuthentication =
	(oAuthProvider: AuthenticationProvider) =>
	async ({
		context,
		input,
	}: AuthenticationEventsOptions<DevWabeTypes, OAuthAuthenticationInterface>) => {
		const { authorizationCode, codeVerifier } = input

		const provider = getProvider(context, oAuthProvider)

		const { accessToken } = await provider.validateAuthorizationCode(
			authorizationCode,
			codeVerifier,
		)

		const userInfoToSave = await provider.getUserInfo(accessToken)
		const providerUserId = getProviderUserId(userInfoToSave?.providerUserId)
		const normalizedEmail = normalizeEmail(userInfoToSave?.email)

		if (!providerUserId) throw new Error('Invalid authentication credentials')

		// For Google, block accounts that are not provider-verified.
		if (oAuthProvider === AuthenticationProvider.Google && userInfoToSave?.verifiedEmail !== true)
			throw new Error('Invalid authentication credentials')

		const users = await context.wabe.controllers.database.getObjects({
			className: 'User',
			where: {
				authentication: {
					[oAuthProvider]: {
						providerUserId: { equalTo: providerUserId },
					},
				},
			},
			context: contextWithRoot(context),
			first: 1,
			select: oauthUserSelect,
		})

		const user = users[0]

		if (user) return { user }

		if (normalizedEmail) {
			const usersByEmail = await context.wabe.controllers.database.getObjects({
				className: 'User',
				where: {
					authentication: {
						[oAuthProvider]: {
							email: { equalTo: normalizedEmail },
						},
					},
				},
				context: contextWithRoot(context),
				first: 1,
				select: oauthUserSelect,
			})

			const userByEmail = usersByEmail[0]
			const oauthStoredSlot = userByEmail?.authentication?.[oAuthProvider]
			const storedProviderUserId = getProviderUserId(
				// @ts-expect-error
				oauthStoredSlot?.providerUserId,
			)

			if (userByEmail && storedProviderUserId && storedProviderUserId !== providerUserId)
				throw new Error('Invalid authentication credentials')

			if (userByEmail) {
				const updatedUser = await context.wabe.controllers.database.updateObject({
					className: 'User',
					id: userByEmail.id,
					context: contextWithRoot(context),
					data: {
						authentication: {
							[oAuthProvider]: {
								...userByEmail.authentication?.[oAuthProvider],
								...userInfoToSave,
								email: normalizedEmail,
								providerUserId,
							},
						},
					},
					select: oauthUserSelect,
				})

				if (!updatedUser) throw new Error('User not found')

				return {
					user: updatedUser,
				}
			}
		}

		const providerToSave =
			oAuthProvider === AuthenticationProvider.Google
				? AuthenticationProviderEnum.google
				: AuthenticationProviderEnum.github

		const createdUser = await context.wabe.controllers.database.createObject({
			className: 'User',
			data: {
				provider: providerToSave,
				isOauth: true,
				authentication: {
					[oAuthProvider]: {
						...userInfoToSave,
						email: normalizedEmail,
						providerUserId,
					},
				},
			},
			context: contextWithRoot(context),
			select: oauthUserSelect,
		})

		if (!createdUser) throw new Error('User not found')

		return {
			user: createdUser,
		}
	}
