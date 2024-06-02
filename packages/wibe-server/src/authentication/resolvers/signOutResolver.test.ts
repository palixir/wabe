import { describe, expect, it, spyOn } from 'bun:test'
import { signOutResolver } from './signOutResolver'
import type { Context } from '../../graphql/interface'
import { Session } from '../Session'

describe('signOut', () => {
	it('should sign out the current user', async () => {
		const spyDeleteSession = spyOn(
			Session.prototype,
			'delete',
		).mockResolvedValue(undefined)

		await signOutResolver(undefined, {}, {
			sessionId: 'sessionId',
		} as Context)

		expect(spyDeleteSession).toHaveBeenCalledTimes(1)
		expect(spyDeleteSession).toHaveBeenCalledWith({
			sessionId: 'sessionId',
		})
	})
})