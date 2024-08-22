import { afterEach, describe, expect, it, spyOn, mock } from 'bun:test'
import * as index from './index'
import { OperationType } from './index'

describe('Hooks', () => {
	const mockGetObject = mock(() => {})
	const mockGetObjects = mock(() => {})
	const mockCallback1 = mock(() => {})
	const mockCallback2 = mock(() => {})
	const mockCallback3 = mock(() => {})
	const mockCallback4 = mock(() => {})
	const mockCallback5 = mock(() => {})

	const databaseController = {
		getObject: mockGetObject,
		getObjects: mockGetObjects,
	} as any

	const config = {
		hooks: [
			{
				callback: mockCallback1,
				operationType: OperationType.BeforeRead,
				priority: 1,
			},
			{
				callback: mockCallback2,
				operationType: OperationType.BeforeRead,
				priority: 2,
			},
			{
				callback: mockCallback3,
				operationType: OperationType.BeforeCreate,
				priority: 1,
			},
			{
				callback: mockCallback4,
				operationType: OperationType.BeforeRead,
				priority: 1,
				className: 'ClassTest',
			},
			{
				callback: mockCallback5,
				operationType: OperationType.BeforeRead,
				priority: 1,
				className: 'AnotherClass',
			},
		],
	} as any

	afterEach(() => {
		mockGetObjects.mockClear()
		mockGetObject.mockClear()
		mockCallback1.mockClear()
		mockCallback2.mockClear()
		mockCallback3.mockClear()
		mockCallback4.mockClear()
		mockCallback5.mockClear()
	})

	it('should only run hook on specified className', async () => {
		const hooks = index.initializeHook({
			className: 'ClassTest',
			context: {
				isRoot: true,
				wabeApp: { databaseController, config } as any,
			},
			newData: { name: 'test' },
		})

		await hooks.runOnSingleObject({
			operationType: OperationType.BeforeRead,
			id: 'id',
		})

		expect(mockCallback4).toHaveBeenCalledTimes(1)
		expect(mockCallback5).toHaveBeenCalledTimes(0)
	})

	it('should run hook on BeforeRead with one object impacted', async () => {
		mockGetObject.mockResolvedValueOnce({ id: 'id', name: 'name' } as never)

		const hooks = index.initializeHook({
			className: 'ClassName',
			context: {
				isRoot: true,
				wabeApp: { databaseController, config } as any,
			},
			newData: { name: 'test' },
		})

		await hooks.runOnSingleObject({
			operationType: OperationType.BeforeRead,
			id: 'id',
		})

		expect(mockGetObject).toHaveBeenCalledTimes(1)
		expect(mockGetObject).toHaveBeenCalledWith({
			className: 'ClassName',
			context: { isRoot: true, wabeApp: { databaseController, config } },
			id: 'id',
			skipHooks: true,
			fields: ['*'],
		})

		expect(mockCallback1).toHaveBeenCalledTimes(1)

		// @ts-expect-error
		const hookObject = mockCallback1.mock.calls[0][0] as any

		expect(hookObject.object).toEqual({
			id: 'id',
			name: 'name',
		})

		expect(hookObject.context).toEqual({
			isRoot: true,
			wabeApp: {
				databaseController: expect.any(Object),
				config,
			},
		})
	})

	it('should run hook on BeforeCreate', async () => {
		const hooks = index.initializeHook({
			className: 'ClassName',
			context: {
				isRoot: true,
				wabeApp: { databaseController, config } as any,
			},
			newData: { name: 'test' },
		})

		await hooks.runOnSingleObject({
			operationType: OperationType.BeforeCreate,
		})

		expect(mockGetObjects).toHaveBeenCalledTimes(0)

		// @ts-expect-error
		const hookObject = mockCallback3.mock.calls[0][0] as any

		expect(hookObject.object).toEqual({ name: 'test' })

		expect(hookObject.context).toEqual({
			isRoot: true,
			wabeApp: { databaseController: expect.any(Object), config },
		})
	})

	it('should run callback in priorities order', async () => {
		const spy_findHooksByPriority = spyOn(index, '_findHooksByPriority')

		mockGetObjects.mockResolvedValueOnce([
			{ id: 'id', name: 'name' },
		] as never)

		const hooks = index.initializeHook({
			className: 'ClassName',
			context: {
				isRoot: true,
				wabeApp: { databaseController, config } as any,
			},
			newData: { name: 'test' },
		})

		await hooks.runOnSingleObject({
			operationType: OperationType.BeforeRead,
			id: 'id',
		})

		expect(spy_findHooksByPriority.mock.calls[0][0].priority).toEqual(1)
		expect(spy_findHooksByPriority.mock.calls[1][0].priority).toEqual(2)
	})

	it('should call hook that is trigger by operation type', async () => {
		mockGetObjects.mockResolvedValueOnce([
			{ id: 'id', name: 'name' },
		] as never)

		const hooks = index.initializeHook({
			className: 'ClassName',
			context: {
				isRoot: true,
				wabeApp: { databaseController, config } as any,
			},
			newData: { name: 'test' },
		})

		await hooks.runOnSingleObject({
			operationType: OperationType.BeforeRead,
			id: 'id',
		})

		expect(mockCallback3).toHaveBeenCalledTimes(0)
	})
})
