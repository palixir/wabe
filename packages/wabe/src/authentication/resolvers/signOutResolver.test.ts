import { describe, expect, it, mock, spyOn, beforeEach } from 'bun:test'
import { signOutResolver } from './signOutResolver'
import { Session } from '../Session'

describe('signOut', () => {
	const mockDeleteCookie = mock(() => {})

	const context = {
		sessionId: 'sessionId',
		wabe: {
			config: {
				authentication: {
					session: {
						cookieSession: true,
					},
				},
			},
		},
		response: {
			deleteCookie: mockDeleteCookie,
		},
	} as any

	beforeEach(() => {
		mockDeleteCookie.mockClear()
	})

	it('should sign out the current user', async () => {
		const spyDeleteSession = spyOn(Session.prototype, 'delete').mockResolvedValue(undefined)

		const res = await signOutResolver(undefined, {}, context)

		expect(res).toBe(true)

		expect(spyDeleteSession).toHaveBeenCalledTimes(1)
		expect(spyDeleteSession).toHaveBeenCalledWith(context)

		expect(mockDeleteCookie).toHaveBeenCalledTimes(3)
		expect(mockDeleteCookie).toHaveBeenNthCalledWith(1, 'accessToken')
		expect(mockDeleteCookie).toHaveBeenNthCalledWith(2, 'refreshToken')
		expect(mockDeleteCookie).toHaveBeenNthCalledWith(3, 'csrfToken')
	})

	it('should not delete cookies when cookieSession is disabled', async () => {
		const noCookieContext = {
			...context,
			wabe: {
				config: {
					authentication: {
						session: {
							cookieSession: false,
						},
					},
				},
			},
		} as any

		const spyDeleteSession = spyOn(Session.prototype, 'delete').mockResolvedValue(undefined)

		await signOutResolver(undefined, {}, noCookieContext)

		expect(mockDeleteCookie).toHaveBeenCalledTimes(0)

		spyDeleteSession.mockRestore()
	})
})
