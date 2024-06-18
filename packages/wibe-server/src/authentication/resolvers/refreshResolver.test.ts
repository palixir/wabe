import { describe, expect, it, spyOn } from 'bun:test'
import { refreshResolver } from './refreshResolver'
import type { Context } from '../../graphql/interface'
import { Session } from '../Session'

const context: Context = {
	sessionId: 'sessionId',
	user: {} as any,
	isRoot: false,
}

describe('refreshResolver', () => {
	it('should refresh the session', async () => {
		const spyRefreshSession = spyOn(
			Session.prototype,
			'refresh',
		).mockResolvedValue({} as any)

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
		expect(spyRefreshSession).toHaveBeenCalledWith(
			'accessToken',
			'refreshToken',
			context,
		)
	})
})
