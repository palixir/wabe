import {
	describe,
	it,
	expect,
	beforeEach,
	spyOn,
	mock,
	beforeAll,
	afterAll,
	afterEach,
} from 'bun:test'
import { authHandler } from './authHandler'
import { WibeApp } from '../..'
import { ProviderEnum } from '../../authentication/interface'
import { GoogleProvider } from '../../authentication/providers/google'

describe('Auth handler', () => {
	const spyGoogleProvider = spyOn(
		GoogleProvider.prototype,
		'validateTokenFromAuthorizationCode',
	)

	beforeAll(() => {
		spyOn(console, 'error').mockImplementation(() => {})
	})

	afterAll(() => {
		spyGoogleProvider.mockRestore()
	})

	beforeEach(() => {
		// @ts-expect-error
		WibeApp.config = {
			port: 3000,
			authentication: {
				successRedirectPath: 'successRedirectPath',
				failureRedirectPath: 'failureRedirectPath',
				providers: {
					GOOGLE: {
						clientId: 'clientId',
						clientSecret: 'clientSecret',
					},
				},
			},
		}
	})

	afterEach(() => {
		spyGoogleProvider.mockReset()
	})

	it('should throw an error if the authentication config is not provided', async () => {
		// @ts-expect-error
		WibeApp.config = { port: 3000 }
		expect(
			authHandler(
				{ query: { code: 'code' } } as any,
				ProviderEnum.GOOGLE,
			),
		).rejects.toThrow('Authentication config not found')
	})

	it('should throw an error if no google code provided', async () => {
		expect(
			authHandler({ query: {} } as any, ProviderEnum.GOOGLE),
		).rejects.toThrow('Authentication : Authorization code not found')
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
			authHandler(
				{ query: { code: 'code' } } as any,
				ProviderEnum.GOOGLE,
			),
		).rejects.toThrow('Authentication : Client id or secret not found')

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
			authHandler(
				{ query: { code: 'code' } } as any,
				ProviderEnum.GOOGLE,
			),
		).rejects.toThrow('Authentication : Client id or secret not found')
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

		await authHandler(context, ProviderEnum.GOOGLE)

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
	})

	it('should redirect to the failure redirect path if something wrong', async () => {
		spyGoogleProvider.mockRejectedValue(new Error('Something wrong'))

		const spyAddCookie = mock(() => {})

		const context = {
			query: { code: 'code' },
			cookie: {
				accessToken: { add: spyAddCookie },
				refreshToken: { add: spyAddCookie },
			},
			set: { redirect: '' },
		} as any

		await authHandler(context, ProviderEnum.GOOGLE)

		expect(spyGoogleProvider).toHaveBeenCalledTimes(1)
		expect(spyGoogleProvider).toHaveBeenCalledWith('code')

		expect(context.set.redirect).toBe('failureRedirectPath')
	})
})
