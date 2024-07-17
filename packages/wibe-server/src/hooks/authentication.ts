import type { ProviderInterface } from '../authentication'
import { Session } from '../authentication/Session'
import { getAuthenticationMethod } from '../authentication/utils'
import type { HookObject } from './HookObject'

export const callAuthenticationProvider = async (
	hookObject: HookObject<any>,
) => {
	if (!hookObject.isFieldUpdate('authentication')) return

	const context = hookObject.context

	const authentication = hookObject.getNewData().authentication

	const { provider, name } = getAuthenticationMethod<any, ProviderInterface>(
		Object.keys(authentication),
		context,
	)

	const inputOfTheGoodAuthenticationMethod = authentication[name]

	const { authenticationDataToSave } = await provider.onSignUp({
		input: inputOfTheGoodAuthenticationMethod,
		context: {
			...hookObject.context,
			isRoot: true,
		},
	})

	hookObject.upsertNewData('authentication', {
		[name]: {
			...authenticationDataToSave,
		},
	})
}

export const createSessionAfterCreateUser = async (
	hookObject: HookObject<any>,
) => {
	if (hookObject.className !== 'User') return

	const session = new Session()

	const context = hookObject.context

	const { accessToken, refreshToken, sessionId } = await session.create(
		hookObject.object.id,
		{
			...context,
			isRoot: true,
		},
	)

	await context.wibe.databaseController.updateObject({
		className: '_Session',
		context: {
			...context,
			isRoot: true,
		},
		id: sessionId,
		fields: [],
		data: {
			accessToken,
			refreshToken,
		},
	})

	if (context.wibe.config.authentication?.session?.cookieSession) {
		context.response?.setCookie('refreshToken', refreshToken, {
			httpOnly: true,
			path: '/',
			secure: process.env.NODE_ENV === 'production',
			expires: new Date(
				Date.now() +
					session.getRefreshTokenExpireIn(context.wibe.config),
			),
		})

		context.response?.setCookie('accessToken', accessToken, {
			httpOnly: true,
			path: '/',
			secure: process.env.NODE_ENV === 'production',
			expires: new Date(
				Date.now() +
					session.getAccessTokenExpireIn(context.wibe.config),
			),
		})
	}
}

export const defaultCallAuthenticationProviderOnBeforeCreateUser = (
	hookObject: HookObject<any>,
) => callAuthenticationProvider(hookObject)

export const defaultCallAuthenticationProviderOnBeforeUpdateUser = (
	hookObject: HookObject<any>,
) => callAuthenticationProvider(hookObject)

export const defaultCreateSessionOnAfterCreateUser = (
	hookObject: HookObject<any>,
) => createSessionAfterCreateUser(hookObject)

export const defaultCreateSessionOnAfterUpdateUser = (
	hookObject: HookObject<any>,
) => createSessionAfterCreateUser(hookObject)
