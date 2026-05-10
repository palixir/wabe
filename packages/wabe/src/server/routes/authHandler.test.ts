import { afterEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { ProviderEnum } from '../../authentication/interface'
import * as helperModule from '../../utils/helper'
import { oauthHandlerCallback } from './authHandler'

const validProviders = new Set<string>(Object.values(ProviderEnum))

describe('OAuth provider validation', () => {
	it('should accept known providers', () => {
		expect(validProviders.has('google')).toBe(true)
		expect(validProviders.has('github')).toBe(true)
	})

	it('should reject unknown providers', () => {
		expect(validProviders.has('evil')).toBe(false)
		expect(validProviders.has('malicious')).toBe(false)
		expect(validProviders.has('')).toBe(false)
		expect(validProviders.has('Google')).toBe(false)
	})

	it('should reject injection-like provider values', () => {
		expect(validProviders.has('google { authorizationCode: "x" } } evil {')).toBe(false)
		expect(validProviders.has('google\n}')).toBe(false)
	})
})

describe('OAuth refresh cookie maxAge', () => {
	it('should use refreshTokenExpiresInMs for refresh cookie maxAge', () => {
		const accessTokenExpiresInMs = 60 * 15 * 1000
		const refreshTokenExpiresInMs = 1000 * 60 * 60 * 24 * 7

		const refreshMaxAge = (refreshTokenExpiresInMs || 1000 * 60 * 60 * 24 * 7) / 1000
		const accessMaxAge = (accessTokenExpiresInMs || 60 * 15 * 1000) / 1000

		expect(refreshMaxAge).toBe(604800)
		expect(accessMaxAge).toBe(900)
		expect(refreshMaxAge).toBeGreaterThan(accessMaxAge)
	})

	it('should default to 7 days for refresh cookie when config is missing', () => {
		const refreshTokenExpiresInMs = undefined
		const maxAge = ((refreshTokenExpiresInMs || 1000 * 60 * 60 * 24 * 7) as number) / 1000
		expect(maxAge).toBe(604800)
	})

	it('should respect custom refreshTokenExpiresInMs value', () => {
		const refreshTokenExpiresInMs = 1000 * 60 * 60 * 24 * 30
		const maxAge = (refreshTokenExpiresInMs || 1000 * 60 * 60 * 24 * 7) / 1000
		expect(maxAge).toBe(2592000)
	})
})

describe('OAuth callback cookies', () => {
	afterEach(() => {
		mock.restore()
	})

	it('should set csrf cookie when cookieSession is enabled', async () => {
		const request = mock().mockResolvedValue({
			signInWith: {
				accessToken: 'access-token',
				refreshToken: 'refresh-token',
			},
		})

		spyOn(helperModule, 'getGraphqlClient').mockReturnValue({
			request,
		} as any)

		const setCookie = mock(() => {})
		const redirect = mock(() => {})
		const context = {
			query: {
				state: encodeURIComponent('state'),
				code: encodeURIComponent('authorization-code'),
			},
			getCookie: (name: string) => {
				if (name === 'state') return 'state'
				if (name === 'code_verifier') return 'code-verifier'
				if (name === 'provider') return 'google'
				return undefined
			},
			res: {
				setCookie,
			},
			redirect,
		} as any

		await oauthHandlerCallback(context, {
			wabe: {
				config: {
					port: 3001,
					authentication: {
						session: {
							jwtSecret: 'dev',
							cookieSession: true,
						},
					},
				},
				controllers: {
					database: {
						getObjects: mock(() =>
							Promise.resolve([
								{
									id: 'session-id',
								},
							]),
						),
					},
				},
			},
		} as any)

		expect(setCookie).toHaveBeenCalledTimes(3)
		expect(setCookie).toHaveBeenNthCalledWith(
			3,
			'csrfToken',
			expect.any(String),
			expect.objectContaining({
				httpOnly: false,
				path: '/',
				sameSite: 'Strict',
				secure: true,
			}),
		)
	})
})
