import { Context } from 'elysia'
import { WibeApp } from '..'
import { ProviderEnum } from '../../authentication/interface'
import { getGraphqlClient } from '../../utils/helper'
import { gql } from 'graphql-request'
import { Google } from '../../authentication/oauth'
import { generateRandomValues } from '../../authentication/oauth/utils'

/*
- Generate code verifier (back)
- Sent post request to a route on back with code verifier in url (back)
- Generate code challenge (back)
- Redirect the user to google auth page with code challenge (back -> front)
- User sign in with google (front)
- The user is redirected to the route with the code (front -> back)
- Get the code from the url (back)
- Validate and sign in with google provider (back)
*/

export const oauthHandlerCallback = async (context: Context) => {
	try {
		const state = context.query.state
		const code = context.query.code

		const stateInCookie = context.cookie.state.value

		if (state !== stateInCookie) throw new Error('Authentication failed')

		const codeVerifier = context.cookie.code_verifier.value
		const provider = context.cookie.provider.value

		await getGraphqlClient(WibeApp.config.port).request<any>(
			gql`
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
			`,
			{
				authorizationCode: code,
				codeVerifier,
			},
		)

		context.set.redirect =
			WibeApp.config.authentication?.successRedirectPath
	} catch (error) {
		console.error(error)
		context.set.redirect =
			WibeApp.config.authentication?.failureRedirectPath
	}
}

export const authHandler = async (context: Context, provider: ProviderEnum) => {
	if (!WibeApp.config) throw new Error('Wibe config not found')
	context.cookie.provider.set({
		value: provider,
		httpOnly: true,
		path: '/',
		maxAge: 60 * 10, // 10 minutes
		secure: Bun.env.NODE_ENV === 'production',
	})

	switch (provider) {
		case ProviderEnum.google: {
			const googleOauth = new Google()

			const state = generateRandomValues()
			const codeVerifier = generateRandomValues()

			context.cookie.code_verifier.remove()
			context.cookie.state.remove()
			delete context.cookie.code_verifier
			delete context.cookie.state

			context.cookie.code_verifier.set({
				value: codeVerifier,
				httpOnly: true,
				path: '/',
				maxAge: 60 * 10, // 10 minutes
				secure: Bun.env.NODE_ENV === 'production',
			})

			context.cookie.state.set({
				value: state,
				httpOnly: true,
				path: '/',
				maxAge: 60 * 10, // 10 minutes
				secure: Bun.env.NODE_ENV === 'production',
			})

			const authorizationURL = await googleOauth.createAuthorizationURL(
				state,
				codeVerifier,
				{
					scopes: ['email'],
				},
			)

			context.set.redirect = authorizationURL.toString()
			break
		}
		default:
			break
	}

	// const code = context.query.code
	// // TODO : Check maybe it's better to store it in http cookie.
	// // https://www.rfc-editor.org/rfc/rfc7636#section-4.4 not precise the storage of codeVerifier
	// const codeVerifier = context.query.code_verifier

	// if (!code || !codeVerifier) throw new Error('Authentication failed')

	// const { authentication } = WibeApp.config

	// if (!authentication) throw new Error('Authentication config not found')

	// try {
	// 	// Here we can't use the classic graphql client because provider is dynamic
	// await getGraphqlClient(WibeApp.config.port).request<any>(gql`
	// 	mutation signInWith(
	// 		$authorizationCode: String!
	// 		$codeVerifier: String!
	// 	) {
	// 		signInWith(
	// 			input: {
	// 				authentication: {
	// 					${provider}: {
	// 						authorizationCode: $authorizationCode
	// 						codeVerifier: $codeVerifier
	// 					}
	// 				}
	// 			}
	// 		)
	// 	}
	// `)

	// 	context.set.redirect = authentication.successRedirectPath
	// } catch (e) {
	//   console.error(e)
	//   context.set.redirect = authentication.failureRedirectPath
	// }
}
