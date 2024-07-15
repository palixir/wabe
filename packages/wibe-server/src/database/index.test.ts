import {
	afterAll,
	beforeAll,
	describe,
	expect,
	it,
	mock,
	spyOn,
	beforeEach,
} from 'bun:test'
import type { WibeApp } from '../server'
import { type DevWibeAppTypes, setupTests, closeTests } from '../utils/helper'
import type { WibeContext } from '../server/interface'
import { OperationType } from '../hooks'
import * as hooks from '../hooks/index'

describe('Database', () => {
	let wibe: WibeApp<DevWibeAppTypes>
	let context: WibeContext<any>

	beforeAll(async () => {
		const setup = await setupTests()
		wibe = setup.wibe

		context = {
			isRoot: true,
			wibe: {
				databaseController: wibe.databaseController,
				config: wibe.config,
			},
		} as WibeContext<any>
	})

	afterAll(async () => {
		await closeTests(wibe)
	})

	beforeEach(async () => {
		await wibe.databaseController.deleteObjects({
			className: 'User',
			where: { name: { equalTo: 'Lucas' } },
			context,
			fields: [],
		})
	})

	it('should call getObjects adapter only 4 times (lower is better) for one read query (performance test) without mutation in hooks', async () => {
		const spyGetObjectAdapter = spyOn(
			wibe.databaseController.adapter,
			'getObjects',
		)

		await wibe.databaseController.createObject({
			className: 'User',
			context,
			data: { name: 'Lucas' },
			fields: [],
		})

		await wibe.databaseController.getObjects({
			className: 'User',
			context,
			fields: ['id'],
		})

		expect(spyGetObjectAdapter).toHaveBeenCalledTimes(4)
	})

	it('should get the good value in output of getObject after mutation on after hook', async () => {
		const mockUpdateObject = mock(async () => {
			// Directly use adapter to avoid mock runMultipleObjects
			await context.wibe.databaseController.adapter.updateObjects({
				className: 'User',
				where: {
					name: { equalTo: 'Lucas' },
				},
				data: { age: 21 },
				context,
				fields: [],
			})
		})

		let indexOfCall = 0

		const mockRunOnSingleObject = mock(async (params) => {
			if (params.operationType !== OperationType.AfterRead)
				return { newData: { name: 'Lucas', age: 20 } }

			if (indexOfCall === 1) await mockUpdateObject()

			indexOfCall += 1

			return { newData: { name: 'Lucas', age: 20 } }
		})

		const spyInitializeHooks = spyOn(
			hooks,
			'initializeHook',
		).mockReturnValue({
			runOnSingleObject: mockRunOnSingleObject,
			runOnMultipleObjects: mock(() => {}),
		} as any)

		const res = await context.wibe.databaseController.createObject({
			className: 'User',
			data: { name: 'Lucas', age: 20 },
			context,
			fields: ['age'],
		})

		const res2 = await context.wibe.databaseController.getObject({
			className: 'User',
			id: res.id,
			fields: ['age'],
			context,
		})

		expect(mockUpdateObject).toHaveBeenCalledTimes(1)

		expect(res2.age).toEqual(21)

		spyInitializeHooks.mockRestore()
	})

	it('should get the good value in output of getObjects after mutation on after hook', async () => {
		let indexOfCall = 0

		const mockUpdateObject = mock(async () => {
			if (indexOfCall > 1) return

			// Directly use adapter to avoid mock runMultipleObjects
			await context.wibe.databaseController.adapter.updateObjects({
				className: 'User',
				where: {
					name: { equalTo: 'Lucas' },
				},
				data: { age: 21 },
				context,
				fields: [],
			})
		})

		const mockRunOnMultipleObject = mock(async (params) => {
			if (params.operationType !== OperationType.AfterRead)
				return { newData: [{ name: 'Lucas', age: 20 }] }

			indexOfCall += 1

			if (indexOfCall === 1) await mockUpdateObject()

			return { newData: [{ name: 'Lucas', age: 20 }] }
		})

		const spyInitializeHooks = spyOn(
			hooks,
			'initializeHook',
		).mockReturnValue({
			runOnSingleObject: mock(() => ({
				newData: { name: 'Lucas', age: 20 },
			})),
			runOnMultipleObjects: mockRunOnMultipleObject,
		} as any)

		await context.wibe.databaseController.createObject({
			className: 'User',
			data: { name: 'Lucas', age: 20 },
			context,
			fields: ['age'],
		})

		const res2 = await context.wibe.databaseController.getObjects({
			className: 'User',
			fields: ['age', 'name'],
			context,
			where: { name: { equalTo: 'Lucas' } },
		})

		expect(mockUpdateObject).toHaveBeenCalledTimes(1)

		expect(res2[0].age).toEqual(21)

		spyInitializeHooks.mockRestore()
	})

	it('should get the good value in output of createObject after mutation on after hook', async () => {
		const mockUpdateObject = mock(async () => {
			// Directly use adapter to avoid mock runMultipleObjects
			await context.wibe.databaseController.adapter.updateObjects({
				className: 'User',
				where: {
					name: { equalTo: 'Lucas' },
				},
				data: { age: 21 },
				context,
				fields: [],
			})
		})

		const mockRunOnSingleObject = mock(async (params) => {
			if (params.operationType !== OperationType.AfterCreate)
				return { newData: { name: 'Lucas', age: 20 } }

			await mockUpdateObject()

			return { newData: { name: 'Lucas', age: 20 } }
		})

		const spyInitializeHooks = spyOn(
			hooks,
			'initializeHook',
		).mockReturnValue({
			runOnSingleObject: mockRunOnSingleObject,
			runOnMultipleObjects: mock(() => {}),
		} as any)

		const res = await context.wibe.databaseController.createObject({
			className: 'User',
			data: { name: 'Lucas', age: 20 },
			context,
			fields: ['age'],
		})

		expect(mockUpdateObject).toHaveBeenCalledTimes(1)

		expect(res.age).toEqual(21)

		spyInitializeHooks.mockRestore()
	})

	it('should get the good value in output of createObjects after mutation on after hook', async () => {
		const mockUpdateObject = mock(async () => {
			// Directly use adapter to avoid mock runMultipleObjects
			await context.wibe.databaseController.adapter.updateObjects({
				className: 'User',
				where: {
					name: { equalTo: 'Lucas' },
				},
				data: { age: 21 },
				context,
				fields: [],
			})
		})

		const mockRunOnMultipleObjects = mock(async (params) => {
			if (params.operationType !== OperationType.AfterCreate)
				return { newData: [{ name: 'Lucas', age: 20 }] }

			await mockUpdateObject()

			return { newData: [{ name: 'Lucas', age: 20 }] }
		})

		const spyInitializeHooks = spyOn(
			hooks,
			'initializeHook',
		).mockReturnValue({
			runOnMultipleObjects: mockRunOnMultipleObjects,
		} as any)

		const res = await context.wibe.databaseController.createObjects({
			className: 'User',
			data: [{ name: 'Lucas', age: 20 }],
			context,
			fields: ['age'],
		})

		expect(mockUpdateObject).toHaveBeenCalledTimes(1)

		expect(res[0].age).toEqual(21)

		spyInitializeHooks.mockRestore()
	})

	it('should get the good value in output of updateObject after mutation on after hook', async () => {
		const mockUpdateObject = mock(async () => {
			// Directly use adapter to avoid mock runMultipleObjects
			await context.wibe.databaseController.adapter.updateObjects({
				className: 'User',
				where: {
					name: { equalTo: 'Lucas' },
				},
				data: { age: 21 },
				context,
				fields: [],
			})
		})

		const mockRunOnSingleObject = mock(async (params) => {
			if (params.operationType !== OperationType.AfterUpdate)
				return { newData: { name: 'Lucas', age: 20 } }

			await mockUpdateObject()

			return { newData: { name: 'Lucas', age: 20 } }
		})

		const spyInitializeHooks = spyOn(
			hooks,
			'initializeHook',
		).mockReturnValue({
			runOnSingleObject: mockRunOnSingleObject,
			runOnMultipleObjects: mock(() => {}),
		} as any)

		const res = await context.wibe.databaseController.createObject({
			className: 'User',
			data: { name: 'Lucas', age: 20 },
			context,
			fields: ['age'],
		})

		const res2 = await context.wibe.databaseController.updateObject({
			className: 'User',
			data: { name: 'Lucas2' },
			context,
			fields: ['age'],
			id: res.id,
		})

		expect(mockUpdateObject).toHaveBeenCalledTimes(1)

		expect(res2.age).toEqual(21)

		spyInitializeHooks.mockRestore()
	})

	it('should get the good value in output of updateObjects after mutation on after hook', async () => {
		const mockUpdateObject = mock(async () => {
			// Directly use adapter to avoid mock runMultipleObjects
			await context.wibe.databaseController.adapter.updateObjects({
				className: 'User',
				where: {
					name: { equalTo: 'Lucas' },
				},
				data: { age: 21 },
				context,
				fields: [],
			})
		})

		const mockRunOnMultipleObject = mock(async (params) => {
			if (params.operationType !== OperationType.AfterUpdate)
				return { newData: [{ name: 'Lucas', age: 20 }] }

			await mockUpdateObject()

			return { newData: [{ name: 'Lucas', age: 20 }] }
		})

		const spyInitializeHooks = spyOn(
			hooks,
			'initializeHook',
		).mockReturnValue({
			runOnSingleObject: mock(() => ({
				newData: { name: 'Lucas', age: 20 },
			})),
			runOnMultipleObjects: mockRunOnMultipleObject,
		} as any)

		await context.wibe.databaseController.createObject({
			className: 'User',
			data: { name: 'Lucas', age: 20 },
			context,
			fields: ['age'],
		})

		const res2 = await context.wibe.databaseController.updateObjects({
			className: 'User',
			data: { name: 'Lucas2' },
			context,
			fields: ['age'],
			where: {
				name: { equalTo: 'Lucas' },
			},
		})

		expect(mockUpdateObject).toHaveBeenCalledTimes(1)

		expect(res2[0].age).toEqual(21)

		spyInitializeHooks.mockRestore()
	})
})
