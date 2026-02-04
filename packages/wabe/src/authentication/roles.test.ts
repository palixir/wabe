import { afterAll, beforeAll, describe, it, expect } from 'bun:test'
import type { Wabe } from '../server'
import type { DevWabeTypes } from '../utils/helper'
import { initializeRoles } from './roles'
import { setupTests, closeTests } from '../utils/testHelper'

describe('roles', () => {
	let wabe: Wabe<DevWabeTypes>

	beforeAll(async () => {
		const setup = await setupTests()
		wabe = setup.wabe
	})

	afterAll(async () => {
		await closeTests(wabe)
	})

	it('should create all roles', async () => {
		await wabe.controllers.database.clearDatabase()

		await initializeRoles(wabe)

		const res = await wabe.controllers.database.getObjects({
			className: 'Role',
			context: { isRoot: true, wabe: wabe },
			select: { name: true },
		})

		expect(res.length).toEqual(4)
		expect(res.map((role) => role?.name)).toEqual(['Client', 'Client2', 'Client3', 'Admin'])
	})

	it('should not create all roles if there already exist', async () => {
		await wabe.controllers.database.clearDatabase()

		await initializeRoles(wabe)
		await initializeRoles(wabe)

		const res = await wabe.controllers.database.getObjects({
			className: 'Role',
			context: { isRoot: true, wabe: wabe },
			select: { name: true },
		})

		expect(res.length).toEqual(4)
		expect(res.map((role) => role?.name)).toEqual(['Client', 'Client2', 'Client3', 'Admin'])
	})
})
