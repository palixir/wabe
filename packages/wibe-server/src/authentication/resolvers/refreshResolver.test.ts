import { describe, expect, it, spyOn } from 'bun:test'
import { refreshResolver } from './refreshResolver'
import { Context } from '../../graphql/interface'
import { Session } from '../Session'

const context: Context = {
	sessionId: 'sessionId',
	user: {} as any,
}

describe('refreshResolver', () => {
	it('should refresh the session', async () => {
		const spyRefreshSession = spyOn(
			Session.prototype,
			'refresh',
		).mockResolvedValue({} as any)

		await refreshResolver(null, null, context)

		expect(spyRefreshSession).toHaveBeenCalledTimes(1)
		expect(spyRefreshSession).toHaveBeenCalledWith(
			context.sessionId,
			context,
		)
	})
})
