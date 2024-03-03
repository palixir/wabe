import { describe, expect, it, spyOn, mock } from 'bun:test'
import { fail } from 'assert'
import { OAuth2Client } from './Oauth2Client'
import { base64URLencode } from './utils'

const mockFetch = mock(() => {})

// @ts-expect-error
global.fetch = mockFetch

describe('Oauth2Client', () => {
	const oauthClient = new OAuth2Client(
		'clientId',
		'https://authorizationEndpoint',
		'https://tokenEndpoint',
		'https://redirectURI',
	)

	it('should create authorization URl', async () => {
		const authorizationURL = await oauthClient.createAuthorizationURL()

		expect(authorizationURL.toString()).toEqual(
			'https://authorizationendpoint/?response_type=code&client_id=clientId&redirect_uri=https%3A%2F%2FredirectURI',
		)

		const authorizationURLWithState =
			await oauthClient.createAuthorizationURL({
				state: 'state',
			})

		expect(authorizationURLWithState.toString()).toEqual(
			'https://authorizationendpoint/?response_type=code&client_id=clientId&state=state&redirect_uri=https%3A%2F%2FredirectURI',
		)

		const authorizationURLWithScopes =
			await oauthClient.createAuthorizationURL({
				scopes: ['scope1', 'scope2'],
			})

		expect(authorizationURLWithScopes.toString()).toEqual(
			'https://authorizationendpoint/?response_type=code&client_id=clientId&scope=scope1+scope2&redirect_uri=https%3A%2F%2FredirectURI',
		)

		const authorizationURLWithCodeVerifier =
			await oauthClient.createAuthorizationURL({
				codeVerifier: 'codeVerifier',
			})

		const codeChallenge = base64URLencode('codeVerifier')

		expect(authorizationURLWithCodeVerifier.toString()).toEqual(
			`https://authorizationendpoint/?response_type=code&client_id=clientId&redirect_uri=https%3A%2F%2FredirectURI&code_challenge_method=S256&code_challenge=${codeChallenge.replace(
				'/',
				'%2F',
			)}`,
		)
	})

	it('should validate authorization code', async () => {
		const spySendTokenRequest = spyOn(
			OAuth2Client.prototype,
			'_sendTokenRequest',
		).mockResolvedValue({} as any)

		await oauthClient.validateAuthorizationCode('code')

		const expectedBody = new URLSearchParams()
		expectedBody.set('code', 'code')
		expectedBody.set('client_id', 'clientId')
		expectedBody.set('grant_type', 'authorization_code')
		expectedBody.set('redirect_uri', 'https://redirectURI')

		expect(spySendTokenRequest).toHaveBeenCalledTimes(1)
		const body = spySendTokenRequest.mock.calls[0][0]
		const options = spySendTokenRequest.mock.calls[0][1]
		expect(body.toString()).toEqual(expectedBody.toString())
		expect(options).toBeUndefined()

		await oauthClient.validateAuthorizationCode('code', {
			codeVerifier: 'codeVerifier',
			authenticateWith: 'http_basic_auth',
			credentials: 'credentials',
		})

		const expectedBody2 = new URLSearchParams()
		expectedBody2.set('code', 'code')
		expectedBody2.set('client_id', 'clientId')
		expectedBody2.set('grant_type', 'authorization_code')
		expectedBody2.set('redirect_uri', 'https://redirectURI')
		expectedBody2.set('code_verifier', 'codeVerifier')

		expect(spySendTokenRequest).toHaveBeenCalledTimes(2)
		const body2 = spySendTokenRequest.mock.calls[1][0]
		const options2 = spySendTokenRequest.mock.calls[1][1]
		expect(body2.toString()).toEqual(expectedBody2.toString())
		expect(options2).toEqual({
			codeVerifier: 'codeVerifier',
			authenticateWith: 'http_basic_auth',
			credentials: 'credentials',
		} as any)

		spySendTokenRequest.mockRestore()
	})

	it('should refresh access token', async () => {
		const spySendTokenRequest = spyOn(
			OAuth2Client.prototype,
			'_sendTokenRequest',
		).mockResolvedValue({} as any)

		await oauthClient.refreshAccessToken('refreshToken')

		const expectedBody = new URLSearchParams()
		expectedBody.set('refresh_token', 'refreshToken')
		expectedBody.set('client_id', 'clientId')
		expectedBody.set('grant_type', 'refresh_token')

		expect(spySendTokenRequest).toHaveBeenCalledTimes(1)
		const body = spySendTokenRequest.mock.calls[0][0]
		const options = spySendTokenRequest.mock.calls[0][1]
		expect(body.toString()).toEqual(expectedBody.toString())
		expect(options).toBeUndefined()

		await oauthClient.refreshAccessToken('refreshToken', {
			authenticateWith: 'http_basic_auth',
			credentials: 'credentials',
		})

		const expectedBody2 = new URLSearchParams()
		expectedBody2.set('refresh_token', 'refreshToken')
		expectedBody2.set('client_id', 'clientId')
		expectedBody2.set('grant_type', 'refresh_token')

		expect(spySendTokenRequest).toHaveBeenCalledTimes(2)
		const body2 = spySendTokenRequest.mock.calls[1][0]
		const options2 = spySendTokenRequest.mock.calls[1][1]
		expect(body2.toString()).toEqual(expectedBody2.toString())
		expect(options2).toEqual({
			authenticateWith: 'http_basic_auth',
			credentials: 'credentials',
		})

		spySendTokenRequest.mockRestore()
	})

	it('should send token request', async () => {
		mockFetch.mockResolvedValue({
			json: () => Promise.resolve({ access_token: 'access_token' }),
			ok: true,
			status: 200,
		} as never)

		await oauthClient._sendTokenRequest(new URLSearchParams(), {
			authenticateWith: 'http_basic_auth',
			credentials: 'credentials',
		})

		const encodeCredentials = btoa('clientId:credentials')

		expect(mockFetch).toHaveBeenCalledTimes(1)
		// @ts-expect-error
		const receivedRequest = mockFetch.mock.calls[0][0] as any

		if (!receivedRequest) fail()
		expect(receivedRequest.url).toEqual('https://tokenendpoint/')
		expect(receivedRequest.method).toEqual('POST')
		expect(receivedRequest.headers.get('content-type')).toEqual(
			'application/x-www-form-urlencoded',
		)
		expect(receivedRequest.headers.get('accept')).toEqual(
			'application/json',
		)
		expect(receivedRequest.headers.get('user-agent')).toEqual('wibe')
		expect(receivedRequest.headers.get('authorization')).toEqual(
			`Basic ${encodeCredentials}`,
		)

		mockFetch.mockRestore()
	})

	it('should throw an error if the result of the request is not valid', async () => {
		mockFetch.mockResolvedValue({
			json: () => Promise.resolve({}),
			ok: false,
		} as never)

		expect(
			oauthClient._sendTokenRequest(new URLSearchParams(), {
				authenticateWith: 'http_basic_auth',
				credentials: 'credentials',
			}),
		).rejects.toThrow('Error in token request')

		mockFetch.mockResolvedValue({
			json: () => Promise.resolve({}),
			ok: true,
			status: 400,
		} as never)

		expect(
			oauthClient._sendTokenRequest(new URLSearchParams(), {
				authenticateWith: 'http_basic_auth',
				credentials: 'credentials',
			}),
		).rejects.toThrow('Error in token request')

		mockFetch.mockResolvedValue({
			json: () => Promise.resolve({}),
			ok: true,
			status: 200,
		} as never)

		expect(
			oauthClient._sendTokenRequest(new URLSearchParams(), {
				authenticateWith: 'http_basic_auth',
				credentials: 'credentials',
			}),
		).rejects.toThrow('Error in token request')

		mockFetch.mockRestore()
	})
})
