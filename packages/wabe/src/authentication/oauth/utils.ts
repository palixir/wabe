import crypto from 'node:crypto'

export interface Tokens {
  accessToken: string
  refreshToken?: string | null
  accessTokenExpiresAt?: Date
  refreshTokenExpiresAt?: Date | null
  idToken?: string
}

export interface OAuth2ProviderWithPKCE {
  createAuthorizationURL(state: string, codeVerifier: string): URL
  validateAuthorizationCode(code: string, codeVerifier: string): Promise<Tokens>
  refreshAccessToken?(refreshToken: string): Promise<Tokens>
}

// https://datatracker.ietf.org/doc/html/rfc7636#appendix-A
export const base64URLencode = (content: string) => {
  const hasher = crypto.createHash('sha256').update(content)

  const result = hasher.digest('base64')

  return result.split('=')[0].replaceAll('+', '-').replaceAll('/', '_')
}

export const generateRandomValues = () =>
  crypto.randomBytes(60).toString('base64url')
