import { describe, beforeAll, afterAll, afterEach, it, expect } from 'bun:test'
import type { Wabe } from 'src'
import type { DevWabeTypes } from 'src/utils/helper'
import { setupTests, closeTests } from 'src/utils/testHelper'

describe('createUser hook', () => {
	let wabe: Wabe<DevWabeTypes>

	beforeAll(async () => {
		const setup = await setupTests()
		wabe = setup.wabe
	})

	afterAll(async () => {
		await closeTests(wabe)
	})

	afterEach(async () => {
		await wabe.controllers.database.clearDatabase()
	})

	it('should throw an error if disableSignUp is true and user is anonymous', () => {
		if (wabe.config) {
			wabe.config.authentication = {
				disableSignUp: true,
			}
		}

		expect(
			wabe.controllers.database.createObject({
				className: 'User',
				context: {
					wabe,
					isRoot: false,
				},
				data: {
					email: 'email@test.fr',
				},
				select: {},
			}),
		).rejects.toThrow('Sign up is disabled')

		if (wabe.config) {
			wabe.config.authentication = {
				disableSignUp: false,
			}
		}
	})

	it('should not throw an error if disableSignUp is true and user is root', async () => {
		if (wabe.config) {
			wabe.config.authentication = {
				disableSignUp: true,
			}
		}

		const res = await wabe.controllers.database.createObject({
			className: 'User',
			context: {
				wabe,
				isRoot: true,
			},
			data: {
				email: 'email@test.fr',
			},
			select: { id: true },
		})

		expect(res?.id).toBeDefined()

		if (wabe.config) {
			wabe.config.authentication = {
				disableSignUp: false,
			}
		}
	})
})
