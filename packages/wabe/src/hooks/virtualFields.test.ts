import { afterAll, beforeAll, beforeEach, describe, expect, it, spyOn } from 'bun:test'
import type { Wabe } from '../server'
import { type DevWabeTypes } from '../utils/helper'
import { closeTests, setupTests } from '../utils/testHelper'

describe('Virtual fields integration', () => {
	let wabe: Wabe<DevWabeTypes>

	beforeAll(async () => {
		const setup = await setupTests([
			{
				name: 'VirtualPerson',
				fields: {
					firstName: { type: 'String' },
					lastName: { type: 'String' },
					age: { type: 'Int' },
					fullName: {
						type: 'Virtual',
						returnType: 'String',
						dependsOn: ['firstName', 'lastName'],
						callback: (object: any) => `${object.firstName} ${object.lastName}`.trim(),
					},
					isAdult: {
						type: 'Virtual',
						returnType: 'Boolean',
						dependsOn: ['age'],
						callback: (object: any) => (object.age ?? 0) >= 18,
					},
				},
				permissions: {
					read: { requireAuthentication: false },
					create: { requireAuthentication: false },
					update: { requireAuthentication: false },
					delete: { requireAuthentication: false },
				},
			},
		])

		wabe = setup.wabe
	})

	afterAll(async () => {
		await closeTests(wabe)
	})

	beforeEach(async () => {
		await wabe.controllers.database.clearDatabase()
	})

	it('computes virtual fields from dependsOn without leaking dependencies', async () => {
		const created = await wabe.controllers.database.createObject({
			// @ts-expect-error
			className: 'VirtualPerson',
			context: { isRoot: true, wabe },
			data: {
				// @ts-expect-error
				firstName: 'Ada',
				lastName: 'Lovelace',
				age: 37,
			},
			select: { id: true },
		})

		const result = await wabe.controllers.database.getObject({
			// @ts-expect-error Test class only exists in test schema
			className: 'VirtualPerson',
			context: { isRoot: true, wabe },
			id: created?.id || '',
			select: {
				// @ts-expect-error
				fullName: true,
			},
		})

		const resultAny: any = result
		expect(resultAny?.fullName).toBe('Ada Lovelace')
		expect(resultAny?.firstName).toBeUndefined()
		expect(resultAny?.lastName).toBeUndefined()
	})

	it('loads dependencies in adapter select and never requests virtual keys directly on database', async () => {
		const adapterGetObjectSpy = spyOn(wabe.controllers.database.adapter, 'getObject')

		const created = await wabe.controllers.database.createObject({
			// @ts-expect-error
			className: 'VirtualPerson',
			context: { isRoot: true, wabe },
			data: {
				// @ts-expect-error
				firstName: 'Grace',
				lastName: 'Hopper',
				age: 30,
			},
			select: { id: true },
		})

		adapterGetObjectSpy.mockClear()

		await wabe.controllers.database.getObject({
			// @ts-expect-error
			className: 'VirtualPerson',
			context: { isRoot: true, wabe },
			id: created?.id || '',
			select: {
				// @ts-expect-error
				fullName: true,
				isAdult: true,
			},
		})

		expect(adapterGetObjectSpy.mock.calls.length).toBeGreaterThanOrEqual(1)
		const adapterCallWithVirtualDependencies = adapterGetObjectSpy.mock.calls.find((call: any) => {
			const options = call[0]
			return (
				options?.className === 'VirtualPerson' &&
				options?.id === (created?.id || '') &&
				options?.select?.firstName === true &&
				options?.select?.lastName === true &&
				options?.select?.age === true &&
				options?.select?.fullName === undefined &&
				options?.select?.isAdult === undefined
			)
		})

		expect(adapterCallWithVirtualDependencies).toBeDefined()
	})

	it('ignores virtual fields in create and update payloads', async () => {
		const created = await wabe.controllers.database.createObject({
			// @ts-expect-error
			className: 'VirtualPerson',
			context: { isRoot: true, wabe },
			data: {
				// @ts-expect-error
				firstName: 'Initial',
				lastName: 'User',
				age: 20,
				fullName: 'MUST_BE_IGNORED',
			},
			select: { id: true },
		})

		await wabe.controllers.database.updateObject({
			// @ts-expect-error
			className: 'VirtualPerson',
			context: { isRoot: true, wabe },
			id: created?.id || '',
			data: {
				// @ts-expect-error
				firstName: 'Updated',
				fullName: 'MUST_STILL_BE_IGNORED',
			},
			select: {},
		})

		const read = await wabe.controllers.database.getObject({
			// @ts-expect-error
			className: 'VirtualPerson',
			context: { isRoot: true, wabe },
			id: created?.id || '',
			select: {
				// @ts-expect-error
				firstName: true,
				lastName: true,
				fullName: true,
			},
		})

		// @ts-expect-error
		expect(read?.firstName).toBe('Updated')
		// @ts-expect-error
		expect(read?.lastName).toBe('User')
		// @ts-expect-error
		expect(read?.fullName).toBe('Updated User')
	})
})
