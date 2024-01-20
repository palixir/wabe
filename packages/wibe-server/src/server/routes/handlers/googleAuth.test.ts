import { describe, it, expect, beforeEach, spyOn, mock } from 'bun:test'
import { googleAuthHandler } from './googleAuth'
import { WibeApp } from '../..'
import { GoogleProvider } from '../../../authentication/providers/google'

describe('Google auth handler', () => {
	beforeEach(() => {
		WibeApp.config = {
			port: 3000,
			authentication: {
				successRedirectPath: 'successRedirectPath',
				failureRedirectPath: 'failureRedirectPath',
				// @ts-expect-error
				providers: {
					GOOGLE: {
						clientId: 'clientId',
						clientSecret: 'clientSecret',
					},
				},
			},
		}
	})

	it('should throw an error if the authentication config is not provided', async () => {
		// @ts-expect-error
		WibeApp.config = { port: 3000 }
		expect(
			googleAuthHandler({ query: { code: 'code' } } as any),
		).rejects.toThrow('Authentication config not found')
	})

	it('should throw an error if no google code provided', async () => {
		expect(googleAuthHandler({ query: {} } as any)).rejects.toThrow(
			'Authentication : Google code not found',
		)
	})

	it('should throw an error if the google client id or client secret is not provided ', async () => {
		WibeApp.config = {
			port: 3000,
			authentication: {
				successRedirectPath: 'successRedirectPath',
				failureRedirectPath: 'failureRedirectPath',
				providers: {
					// @ts-expect-error
					GOOGLE: {
						clientSecret: 'clientSecret',
					},
				},
			},
		}

		expect(
			googleAuthHandler({ query: { code: 'code' } } as any),
		).rejects.toThrow(
			'Authentication : Google client id or secret not found',
		)

		WibeApp.config = {
			port: 3000,
			authentication: {
				successRedirectPath: 'successRedirectPath',
				failureRedirectPath: 'failureRedirectPath',
				providers: {
					// @ts-expect-error
					GOOGLE: {
						clientId: 'clientId',
					},
				},
			},
		}

		expect(
			googleAuthHandler({ query: { code: 'code' } } as any),
		).rejects.toThrow(
			'Authentication : Google client id or secret not found',
		)
	})

	it('should call google provider to check the code and generate access and refresh token', async () => {
		const spyGoogleProvider = spyOn(
			GoogleProvider.prototype,
			'validateTokenFromAuthorizationCode',
		).mockResolvedValue({
			refreshToken: 'refreshToken',
			accessToken: 'accessToken',
		})

		const spyAddCookie = mock(() => {})

		const context = {
			query: { code: 'code' },
			cookie: {
				accessToken: { add: spyAddCookie },
				refreshToken: { add: spyAddCookie },
			},
			set: { redirect: '' },
		} as any

		await googleAuthHandler(context)

		expect(spyGoogleProvider).toHaveBeenCalledTimes(1)
		expect(spyGoogleProvider).toHaveBeenCalledWith('code')

		expect(spyAddCookie).toHaveBeenCalledTimes(2)
		expect(spyAddCookie).toHaveBeenCalledWith({
			value: 'accessToken',
			httpOnly: true,
			path: '/',
			expires: expect.any(Date),
		})

		expect(spyAddCookie).toHaveBeenCalledWith({
			value: 'refreshToken',
			httpOnly: true,
			path: '/',
			expires: expect.any(Date),
		})

		expect(context.set.redirect).toBe('successRedirectPath')

		spyGoogleProvider.mockReset()
	})

	it('should redirect to the failure redirect path if something wrong', async () => {
		const spyGoogleProvider = spyOn(
			GoogleProvider.prototype,
			'validateTokenFromAuthorizationCode',
		).mockRejectedValue(new Error('Something wrong'))

		const spyAddCookie = mock(() => {})

		const context = {
			query: { code: 'code' },
			cookie: {
				accessToken: { add: spyAddCookie },
				refreshToken: { add: spyAddCookie },
			},
			set: { redirect: '' },
		} as any

		await googleAuthHandler(context)

		expect(spyGoogleProvider).toHaveBeenCalledTimes(1)
		expect(spyGoogleProvider).toHaveBeenCalledWith('code')

		expect(context.set.redirect).toBe('failureRedirectPath')

		spyGoogleProvider.mockReset()
	})
})
