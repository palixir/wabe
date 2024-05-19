import { WibeApp } from '../server'
import type {
	CustomAuthenticationMethods,
	ProviderInterface,
	SecondaryProviderInterface,
} from './interface'

export const getAuthenticationMethod = <
	T extends ProviderInterface | SecondaryProviderInterface,
>(
	listOfMethods: string[],
): CustomAuthenticationMethods<T> => {
	const customAuthenticationConfig =
		WibeApp.config?.authentication?.customAuthenticationMethods

	if (!customAuthenticationConfig)
		throw new Error('No custom authentication methods found')

	// We remove the secondary factor to only get all authentication methods
	const authenticationMethods = listOfMethods.filter(
		(method) => method !== 'secondaryFactor',
	)

	// We check if the client don't use multiple authentication methods at the same time
	if (authenticationMethods.length > 1 || authenticationMethods.length === 0)
		throw new Error('One authentication method is required at the time')

	const authenticationMethod = authenticationMethods[0]

	// We check if the authentication method is valid
	const validAuthenticationMethod = customAuthenticationConfig.find(
		(method) =>
			method.name.toLowerCase() === authenticationMethod.toLowerCase(),
	)

	if (!validAuthenticationMethod)
		throw new Error('No available custom authentication methods found')

	return validAuthenticationMethod as CustomAuthenticationMethods<T>
}
