import type { Context } from 'wobe'
import type { WibeContext } from '../interface'
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

export const oauthHandlerCallback = async (
	context: Context,
	wibeContext: WibeContext<any>,
) => {
	try {
		const state = context.query.state
		const code = context.query.code

		const stateInCookie = context.res.getCookie('state')

		if (state !== stateInCookie) throw new Error('Authentication failed')

		const codeVerifier = context.res.getCookie('code_verifier')
		const provider = context.res.getCookie('provider')

		await getGraphqlClient(wibeContext.config.port).request<any>(
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

		context.redirect(
			wibeContext.config.authentication?.successRedirectPath || '/',
		)
	} catch (error) {
		console.error(error)
		context.redirect(
			wibeContext.config.authentication?.failureRedirectPath || '/',
		)
	}
}

export const authHandler = async (
	context: Context,
	wibeContext: WibeContext<any>,
	provider: ProviderEnum,
) => {
	if (!wibeContext.config) throw new Error('Wibe config not found')

	context.res.setCookie('provider', provider, {
		httpOnly: true,
		path: '/',
		maxAge: 60 * 10, // 10 minutes
		secure: Bun.env.NODE_ENV === 'production',
	})

	switch (provider) {
		case ProviderEnum.google: {
			const googleOauth = new Google(wibeContext.config)

			const state = generateRandomValues()
			const codeVerifier = generateRandomValues()

			context.res.setCookie('code_verifier', codeVerifier, {
				httpOnly: true,
				path: '/',
				maxAge: 60 * 10, // 10 minutes
				secure: Bun.env.NODE_ENV === 'production',
			})

			context.res.setCookie('state', state, {
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

			context.redirect(authorizationURL.toString())

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

	// const { authentication } = context.config

	// if (!authentication) throw new Error('Authentication config not found')

	// try {
	// 	// Here we can't use the classic graphql client because provider is dynamic
	// await getGraphqlClient(context.config.port).request<any>(gql`
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
