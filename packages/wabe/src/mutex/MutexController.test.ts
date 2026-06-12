import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import type { Wabe } from '../server'
import type { DevWabeTypes } from '../utils/helper'
import { closeTests, setupTests } from '../utils/testHelper'

describe('MutexController', () => {
	let wabe: Wabe<DevWabeTypes>

	beforeAll(async () => {
		const setup = await setupTests()
		wabe = setup.wabe
	})

	afterAll(async () => {
		await closeTests(wabe)
	})

	beforeEach(async () => {
		await wabe.controllers.database.clearDatabase()
	})

	it('should lock and unlock a mutex atomically', async () => {
		const mutexName = 'refresh:user-1'

		expect(await wabe.controllers.mutex.getMutexStatus(mutexName)).toBe(false)
		expect(await wabe.controllers.mutex.lockMutex(mutexName)).toBe(true)
		expect(await wabe.controllers.mutex.getMutexStatus(mutexName)).toBe(true)
		expect(await wabe.controllers.mutex.lockMutex(mutexName)).toBe(false)
		expect(await wabe.controllers.mutex.unlockMutex(mutexName)).toBe(true)
		expect(await wabe.controllers.mutex.getMutexStatus(mutexName)).toBe(false)
		expect(await wabe.controllers.mutex.unlockMutex(mutexName)).toBe(false)
	})

	it('should allow only one concurrent lock acquisition', async () => {
		const mutexName = 'refresh:user-concurrent'
		const results = await Promise.all(
			Array.from({ length: 10 }, () => wabe.controllers.mutex.lockMutex(mutexName)),
		)

		expect(results.filter(Boolean).length).toBe(1)
	})

	it('should allow re-lock after unlock', async () => {
		const mutexName = 'refresh:user-relock'

		expect(await wabe.controllers.mutex.lockMutex(mutexName)).toBe(true)
		expect(await wabe.controllers.mutex.unlockMutex(mutexName)).toBe(true)
		expect(await wabe.controllers.mutex.lockMutex(mutexName)).toBe(true)
	})

	it('should not steal a fresh lock', async () => {
		const mutexName = 'refresh:user-fresh'

		expect(await wabe.controllers.mutex.lockMutex(mutexName)).toBe(true)
		// A lock that is younger than the stale threshold cannot be stolen.
		expect(await wabe.controllers.mutex.lockMutex(mutexName, { staleLockMs: 60_000 })).toBe(false)
		expect(await wabe.controllers.mutex.getMutexStatus(mutexName)).toBe(true)
	})

	it('should steal a stale lock left over by a crashed owner', async () => {
		const mutexName = 'refresh:user-stale'

		expect(await wabe.controllers.mutex.lockMutex(mutexName)).toBe(true)

		// Wait so the lock becomes older than the (small) stale threshold below.
		await new Promise((resolve) => setTimeout(resolve, 30))

		expect(await wabe.controllers.mutex.lockMutex(mutexName, { staleLockMs: 10 })).toBe(true)
		// The mutex stays locked: the lock was stolen, not released.
		expect(await wabe.controllers.mutex.getMutexStatus(mutexName)).toBe(true)
	})
})
