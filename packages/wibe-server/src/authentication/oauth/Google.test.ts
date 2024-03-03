import { describe, expect, it, spyOn } from 'bun:test'
import { Google } from './Google'
import { OAuth2Client } from './Oauth2Client'

describe('Google oauth', () => {
	const googleOauth = new Google('clientId', 'clientSecret', 'redirectURI')

	it('should create authorization url', async () => {
		const spyOauth2ClientCreateAuthorizationUrl = spyOn(
			OAuth2Client.prototype,
			'createAuthorizationURL',
		).mockResolvedValue(new URL('https://url') as any)

		const authorizationUrl = await googleOauth.createAuthorizationURL(
			'state',
			'codeVerifier',
		)

		expect(authorizationUrl.toString()).toBe('https://url/?nonce=_')
		expect(spyOauth2ClientCreateAuthorizationUrl).toHaveBeenCalledTimes(1)
		expect(spyOauth2ClientCreateAuthorizationUrl).toHaveBeenCalledWith({
			state: 'state',
			codeVerifier: 'codeVerifier',
			scopes: ['openid'],
		})
	})
})
