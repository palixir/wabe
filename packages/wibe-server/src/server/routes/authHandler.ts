import { Context } from 'elysia'
import { WibeApp } from '..'
import { ProviderEnum } from '../../authentication/interface'
import { getGraphqlClient } from '../../utils/helper'
import { gql } from 'graphql-request'

export const authHandler = async (context: Context, provider: ProviderEnum) => {
	if (!WibeApp.config) throw new Error('Wibe config not found')

	const code = context.query.code
	// TODO : Check maybe it's better to store it in http cookie.
	// https://www.rfc-editor.org/rfc/rfc7636#section-4.4 not precise the storage of codeVerifier
	const codeVerifier = context.query.codeVerifier

	if (!code || !codeVerifier) throw new Error('Authentication failed')

	const { authentication } = WibeApp.config

	if (!authentication) throw new Error('Authentication config not found')

	try {
		// Here we can't use the classic graphql client because provider is dynamic
		await getGraphqlClient(WibeApp.config.port).request<any>(gql`
			mutation signInWith(
				$authorizationCode: String!
				$codeVerifier: String!
			) {
				signInWith(
					input: {
						authentication: {
							${provider}: {
								authorizationCode: $authorizationCode
								codeVerifier: $codeVerifier
							}
						}
					}
				)
			}
		`)

		context.set.redirect = authentication.successRedirectPath
	} catch (e) {
		console.error(e)
		context.set.redirect = authentication.failureRedirectPath
	}
}
