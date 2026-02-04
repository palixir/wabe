import type { DevWabeTypes } from '../../utils/helper'
import {
	AuthenticationProvider,
	type AuthenticationEventsOptions,
	type ProviderInterface,
} from '../interface'
import { oAuthAuthentication } from './OAuth'

type GoogleInterface = {
	authorizationCode: string
	codeVerifier: string
}

export class Google implements ProviderInterface<DevWabeTypes, GoogleInterface> {
	name = 'google'
	onSignIn(options: AuthenticationEventsOptions<DevWabeTypes, GoogleInterface>) {
		return oAuthAuthentication(AuthenticationProvider.Google)(options)
	}

	// @ts-expect-error
	onSignUp() {
		throw new Error('SignUp is not implemented for Oauth provider, you should use signIn instead.')
	}
}
