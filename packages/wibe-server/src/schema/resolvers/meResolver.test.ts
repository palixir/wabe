import { expect, it, describe } from 'bun:test'
import { meResolver } from './meResolver'

describe('me', () => {
	it('should returns all the information of the current user', async () => {
		expect(
			await meResolver(undefined, undefined, {
				isRoot: false,
				user: {
					id: 'userId',
					role: {
						id: 'id',
						name: 'Admin',
					},
				},
			} as any),
		).toEqual({
			user: {
				id: 'userId',
				role: {
					id: 'id',
					name: 'Admin',
				},
			},
		})
	})
})
