import { describe, expect, it, spyOn } from 'bun:test'
import { GitHub } from './GitHub'
import { OAuth2Client } from './Oauth2Client'

describe('GitHub oauth', () => {
  const config = {
    port: 3000,
    authentication: {
      backDomain: 'api.shipmysaas.com',
      providers: {
        github: {
          clientId: 'clientId',
          clientSecret: 'clientSecret',
        },
      },
    },
  } as any

  const githubOauth = new GitHub(config)

  it('should create authorization url', () => {
    const spyOauth2ClientCreateAuthorizationUrl = spyOn(
      OAuth2Client.prototype,
      'createAuthorizationURL',
    ).mockReturnValue(new URL('https://url') as never)

    const authorizationUrl = githubOauth.createAuthorizationURL(
      'state',
      'codeVerifier',
    )

    expect(authorizationUrl.toString()).toBe(
      'https://url/?access_type=offline&prompt=select_account',
    )
    expect(spyOauth2ClientCreateAuthorizationUrl).toHaveBeenCalledTimes(1)
    expect(spyOauth2ClientCreateAuthorizationUrl).toHaveBeenCalledWith({
      state: 'state',
      codeVerifier: 'codeVerifier',
      scopes: ['read:user', 'user:email'],
    })

    spyOauth2ClientCreateAuthorizationUrl.mockRestore()
  })

  it('should validate authorization code', async () => {
    const spyOauth2ClientValidateAuthorizationCode = spyOn(
      OAuth2Client.prototype,
      'validateAuthorizationCode',
    ).mockResolvedValue({
      access_token: 'access_token',
      refresh_token: 'refresh_token',
      expires_in: 3600,
    })

    const res = await githubOauth.validateAuthorizationCode(
      'code',
      'codeVerifier',
    )

    expect(spyOauth2ClientValidateAuthorizationCode).toHaveBeenCalledTimes(1)
    expect(spyOauth2ClientValidateAuthorizationCode).toHaveBeenCalledWith(
      'code',
      {
        authenticateWith: 'request_body',
        credentials: 'clientSecret',
        codeVerifier: 'codeVerifier',
      },
    )

    // +100 to avoid flaky
    expect(
      (res.accessTokenExpiresAt?.getTime() || 0) + 100,
    ).toBeGreaterThanOrEqual(Date.now() + 3600 * 1000)

    spyOauth2ClientValidateAuthorizationCode.mockRestore()
  })

  it('should refresh access token', async () => {
    const spyOauth2ClientRefreshAccessToken = spyOn(
      OAuth2Client.prototype,
      'refreshAccessToken',
    ).mockResolvedValue({
      access_token: 'access_token',
      expires_in: 3600,
    })

    const res = await githubOauth.refreshAccessToken('refresh_token')

    expect(spyOauth2ClientRefreshAccessToken).toHaveBeenCalledTimes(1)
    expect(spyOauth2ClientRefreshAccessToken).toHaveBeenCalledWith(
      'refresh_token',
      {
        authenticateWith: 'request_body',
        credentials: 'clientSecret',
      },
    )

    expect(res.accessToken).toBe('access_token')
    expect(res.accessTokenExpiresAt?.getTime()).toBeGreaterThanOrEqual(
      Date.now() + 3600 * 1000,
    )

    spyOauth2ClientRefreshAccessToken.mockRestore()
  })
})
