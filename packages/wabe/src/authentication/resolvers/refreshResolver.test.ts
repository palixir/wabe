import { describe, expect, it, spyOn } from 'bun:test'
import { refreshResolver } from './refreshResolver'
import type { WabeContext } from '../../server/interface'
import { Session } from '../Session'

const context: WabeContext<any> = {
	sessionId: 'sessionId',
	user: {} as any,
	isRoot: false,
} as WabeContext<any>

describe('refreshResolver', () => {
	it('should refresh the session', async () => {
		const spyRefreshSession = spyOn(Session.prototype, 'refresh').mockResolvedValue({
			accessToken: 'newAccessToken',
			refreshToken: 'newRefreshToken',
		} as any)

		await refreshResolver(
			null,
			{
				input: {
					accessToken: 'accessToken',
					refreshToken: 'refreshToken',
				},
			},
			context,
		)

		expect(spyRefreshSession).toHaveBeenCalledTimes(1)
		expect(spyRefreshSession).toHaveBeenCalledWith('accessToken', 'refreshToken', context)
	})

	it('should throw when refresh tokens are invalid', async () => {
		spyOn(Session.prototype, 'refresh').mockResolvedValue({
			accessToken: null,
			refreshToken: null,
		} as any)

		await expect(
			refreshResolver(
				null,
				{
					input: {
						accessToken: 'accessToken',
						refreshToken: 'refreshToken',
					},
				},
				context,
			),
		).rejects.toThrow('Invalid refresh token')
	})
})
