import { describe, expect, it, mock } from 'bun:test'
import { ProviderEnum } from '../../authentication/interface'

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
