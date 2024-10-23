import type { Context } from 'wobe'
import type { WabeContext } from '../interface'
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

// https://www.rfc-editor.org/rfc/rfc7636#section-4.4 not precise the storage of codeVerifier
export const oauthHandlerCallback = async (
  context: Context,
  wabeContext: WabeContext<any>,
) => {
  try {
    const state = decodeURIComponent(context.query.state)
    const code = decodeURIComponent(context.query.code)

    const stateInCookie = context.getCookie('state')

    if (state !== stateInCookie) throw new Error('Authentication failed')

    const codeVerifier = context.getCookie('code_verifier')
    const provider = context.getCookie('provider')

    const { signInWith } = await getGraphqlClient(
      wabeContext.wabe.config.port,
    ).request<any>(
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
					){
						accessToken
					}
				}
			`,
      {
        authorizationCode: code,
        codeVerifier,
      },
    )

    const accessToken = signInWith.accessToken

    context.res.setCookie('accessToken', accessToken, {
      httpOnly: false,
      path: '/',
      maxAge:
        (wabeContext.wabe.config.authentication?.session
          ?.accessTokenExpiresInMs || 60 * 60 * 24 * 1 * 1000) / 1000, // 1 day in seconds
      secure: process.env.NODE_ENV === 'production',
    })

    context.redirect(
      wabeContext.wabe.config.authentication?.successRedirectPath || '/',
    )
  } catch (error) {
    console.error(error)
    context.redirect(
      wabeContext.wabe.config.authentication?.failureRedirectPath || '/',
    )
  }
}

export const authHandler = async (
  context: Context,
  wabeContext: WabeContext<any>,
  provider: ProviderEnum,
) => {
  if (!wabeContext.wabe.config) throw new Error('Wabe config not found')

  context.res.setCookie('provider', provider, {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 5, // 5 minutes
    secure: process.env.NODE_ENV === 'production',
  })

  switch (provider) {
    case ProviderEnum.google: {
      const googleOauth = new Google(wabeContext.wabe.config)

      const state = generateRandomValues()
      const codeVerifier = generateRandomValues()

      context.res.setCookie('code_verifier', codeVerifier, {
        httpOnly: true,
        path: '/',
        maxAge: 60 * 5, // 5 minutes
        secure: process.env.NODE_ENV === 'production',
      })

      context.res.setCookie('state', state, {
        httpOnly: true,
        path: '/',
        maxAge: 60 * 5, // 5 minutes
        secure: process.env.NODE_ENV === 'production',
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
}
