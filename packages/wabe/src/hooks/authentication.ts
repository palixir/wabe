import type { ProviderInterface } from '../authentication'
import { getAuthenticationMethod } from '../authentication/utils'
import type { DevWabeTypes } from '../utils/helper'
import type { HookObject } from './HookObject'

export const defaultCallAuthenticationProviderOnBeforeCreateUser = async (
	hookObject: HookObject<any, any>,
) => {
	if (!hookObject.isFieldUpdated('authentication') || hookObject.getNewData().isOauth) return

	const context = hookObject.context

	const authentication = hookObject.getNewData().authentication

	// Exception for SRP
	if (authentication.emailPasswordSRP) return

	const { provider, name } = getAuthenticationMethod<DevWabeTypes, ProviderInterface<DevWabeTypes>>(
		Object.keys(authentication),
		context,
	)

	const inputOfTheGoodAuthenticationMethod = authentication[name]

	const { authenticationDataToSave } = await provider.onSignUp({
		input: inputOfTheGoodAuthenticationMethod,
		context,
	})

	hookObject.upsertNewData('authentication', {
		[name]: authenticationDataToSave,
	})
}

export const defaultCallAuthenticationProviderOnBeforeUpdateUser = async (
	hookObject: HookObject<any, any>,
) => {
	if (!hookObject.isFieldUpdated('authentication') || hookObject.getNewData().isOauth) return

	const context = hookObject.context

	const authentication = hookObject.getNewData().authentication

	// Exception for SRP
	if (authentication.emailPasswordSRP) return

	const { provider, name } = getAuthenticationMethod<DevWabeTypes, ProviderInterface<DevWabeTypes>>(
		Object.keys(authentication),
		context,
	)

	if (!provider.onUpdateAuthenticationData) return

	const inputOfTheGoodAuthenticationMethod = authentication[name]

	if (!hookObject.object?.id) return

	const { authenticationDataToSave } = await provider.onUpdateAuthenticationData({
		context,
		input: inputOfTheGoodAuthenticationMethod,
		userId: hookObject.object.id,
	})

	hookObject.upsertNewData('authentication', {
		[name]: authenticationDataToSave,
	})
}
