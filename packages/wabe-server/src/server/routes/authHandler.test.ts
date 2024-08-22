import { describe, it, expect, spyOn, mock, beforeAll } from 'bun:test'
import { authHandler } from './authHandler'
import { ProviderEnum } from '../../authentication/interface'
import { GraphQLClient } from 'graphql-request'

describe.skip('Auth handler', () => {
	beforeAll(() => {
		spyOn(console, 'error').mockImplementation(() => {})
	})

	const config = {
		port: 3000,
		authentication: {
			successRedirectPath: 'successRedirectPath',
			failureRedirectPath: 'failureRedirectPath',
			providers: {
				google: {
					clientId: 'clientId',
					clientSecret: 'clientSecret',
				},
			},
		},
	} as any

	it('should throw an error if the authentication config is not provided', async () => {
		expect(
			authHandler(
				{
					query: { code: 'code', codeVerifier: 'codeVerifier' },
				} as any,
				{ config } as any,
				ProviderEnum.google,
			),
		).rejects.toThrow('Authentication config not found')
	})

	it('should throw an error if no google code provided', async () => {
		expect(
			authHandler(
				{ query: {} } as any,
				{ config } as any,
				ProviderEnum.google,
			),
		).rejects.toThrow('Authentication failed')

		expect(
			authHandler(
				{ query: { code: 'code' } } as any,
				{ config } as any,
				ProviderEnum.google,
			),
		).rejects.toThrow('Authentication failed')

		expect(
			authHandler(
				{ query: { codeVerifier: 'codeVerifier' } } as any,
				{ config } as any,
				ProviderEnum.google,
			),
		).rejects.toThrow('Authentication failed')
	})

	it('should call signInWith mutation', async () => {
		const mockGraphqlClientRequest = spyOn(
			GraphQLClient.prototype,
			'request',
		).mockResolvedValue({})

		const wobeContext = {
			query: { code: 'code', codeVerifier: 'codeVerifier' },
			cookie: {},
			set: { redirect: '' },
		} as any

		await authHandler(wobeContext, { config } as any, ProviderEnum.google)

		expect(mockGraphqlClientRequest).toHaveBeenCalledTimes(1)
		expect(mockGraphqlClientRequest.mock.calls[0][0]).toEqual(
			`
			mutation signInWith(
				$authorizationCode: String!
				$codeVerifier: String!
			) {
				signInWith(
					input: {
						authentication: {
							google: {
								authorizationCode: $authorizationCode
								codeVerifier: $codeVerifier
							}
						}
					}
				)
			}
		` as any,
		)
		expect(wobeContext.set.redirect).toBe('successRedirectPath')

		mockGraphqlClientRequest.mockRestore()
	})

	it('should redirect to the failure redirect path if something wrong', async () => {
		const mockGraphqlClientRequest = spyOn(
			GraphQLClient.prototype,
			'request',
		).mockRejectedValue({})

		const spyAddCookie = mock(() => {})

		const wobeContext = {
			query: { code: 'code', codeVerifier: 'codeVerifier' },
			cookie: {
				accessToken: { add: spyAddCookie },
				refreshToken: { add: spyAddCookie },
			},
			set: { redirect: '' },
		} as any

		await authHandler(wobeContext, { config } as any, ProviderEnum.google)

		expect(mockGraphqlClientRequest).toHaveBeenCalledTimes(1)
		expect(wobeContext.set.redirect).toBe('failureRedirectPath')

		mockGraphqlClientRequest.mockRestore()
	})
})
