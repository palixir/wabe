import { OAuth2Client } from '.'
import type { WabeConfig } from '../../server'
import type { OAuth2ProviderWithPKCE, Tokens } from './utils'

const authorizeEndpoint = 'https://github.com/login/oauth/authorize'
const tokenEndpoint = 'https://github.com/login/oauth/access_token'

interface AuthorizationCodeResponseBody {
  access_token: string
  refresh_token?: string
  expires_in: number
  id_token: string
}

interface RefreshTokenResponseBody {
  access_token: string
  expires_in: number
}

export class GitHub implements OAuth2ProviderWithPKCE {
  private client: OAuth2Client
  private clientSecret: string

  constructor(config: WabeConfig<any>) {
    const githubConfig = config.authentication?.providers?.github

    if (!githubConfig) throw new Error('GitHub config not found')

    const baseUrl = `http${config.isProduction ? 's' : ''}://${config.authentication?.backDomain || '127.0.0.1:' + config.port || 3000}`

    const redirectURI = `${baseUrl}/auth/oauth/callback`

    this.client = new OAuth2Client(
      githubConfig.clientId,
      authorizeEndpoint,
      tokenEndpoint,
      redirectURI,
    )

    this.clientSecret = githubConfig.clientSecret
  }

  createAuthorizationURL(
    state: string,
    codeVerifier: string,
    options?: {
      scopes?: string[]
    },
  ): URL {
    const scopes = options?.scopes ?? []
    const url = this.client.createAuthorizationURL({
      state,
      codeVerifier,
      scopes: [...scopes, 'read:user', 'user:email'],
    })

    url.searchParams.set('access_type', 'offline')
    url.searchParams.set('prompt', 'select_account')

    return url
  }

  async validateAuthorizationCode(
    code: string,
    codeVerifier: string,
  ): Promise<Tokens> {
    const { access_token, expires_in, refresh_token, id_token } =
      await this.client.validateAuthorizationCode<AuthorizationCodeResponseBody>(
        code,
        {
          authenticateWith: 'request_body',
          codeVerifier,
          credentials: this.clientSecret,
        },
      )

    return {
      accessToken: access_token,
      refreshToken: refresh_token,
      accessTokenExpiresAt: new Date(Date.now() + expires_in * 1000),
      idToken: id_token,
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<Tokens> {
    const { access_token, expires_in } =
      await this.client.refreshAccessToken<RefreshTokenResponseBody>(
        refreshToken,
        {
          authenticateWith: 'request_body',
          credentials: this.clientSecret,
        },
      )

    return {
      accessToken: access_token,
      accessTokenExpiresAt: new Date(Date.now() + expires_in * 1000),
    }
  }

  async getUserInfo(accessToken: string) {
    const userInfoResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    })

    const userEmailResponse = await fetch(
      'https://api.github.com/user/emails',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      },
    )

    if (!userInfoResponse.ok || !userEmailResponse.ok)
      throw new Error('Failed to fetch user information from GitHub')

    const userInfo = await userInfoResponse.json()
    const userEmails = await userEmailResponse.json()

    const primaryEmail = userEmails.find((email: any) => email.primary)?.email

    return {
      email: primaryEmail || null,
      username: userInfo.login,
      avatarUrl: userInfo.avatar_url,
    }
  }
}
