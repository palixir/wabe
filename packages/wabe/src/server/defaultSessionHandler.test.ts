import { describe, expect, it, mock, spyOn } from 'bun:test'
import { defaultSessionHandler } from './defaultSessionHandler'
import { Session } from '../authentication/Session'

describe('defaultSessionHandler', () => {
	it('should set refreshToken cookie expiration to refresh expiry', async () => {
		const refreshExpiry = new Date('2030-01-01T00:00:00.000Z')
		const accessExpiry = new Date('2029-01-01T00:00:00.000Z')

		const spyMeFromAccessToken = spyOn(Session.prototype, 'meFromAccessToken').mockResolvedValue({
			user: { id: 'userId' } as any,
			sessionId: 'sessionId',
			accessToken: 'newAccess',
			refreshToken: 'newRefresh',
		})

		const spyGetAccessTokenExpireAt = spyOn(
			Session.prototype,
			'getAccessTokenExpireAt',
		).mockReturnValue(accessExpiry)
		const spyGetRefreshTokenExpireAt = spyOn(
			Session.prototype,
			'getRefreshTokenExpireAt',
		).mockReturnValue(refreshExpiry)

		const setCookie = mock(() => {})

		const wabe: any = {
			config: {
				rootKey: 'root',
				authentication: {
					session: { cookieSession: true, jwtSecret: 'dev' },
				},
			},
		}

		const handler = defaultSessionHandler(wabe)

		const ctx: any = {
			request: new Request('http://localhost/graphql', {
				headers: new Headers({
					'Wabe-Access-Token': 'oldAccess',
				}),
			}),
			res: {
				setCookie,
			},
		}

		await handler(ctx)

		const refreshCookie = setCookie.mock.calls.find(
			(call: unknown) => Array.isArray(call) && call.length > 0 && call[0] === 'refreshToken',
		) as [string, string, { expires?: Date }] | undefined

		expect(refreshCookie?.[2]?.expires).toEqual(refreshExpiry)

		spyMeFromAccessToken.mockRestore()
		spyGetAccessTokenExpireAt.mockRestore()
		spyGetRefreshTokenExpireAt.mockRestore()
	})
})
