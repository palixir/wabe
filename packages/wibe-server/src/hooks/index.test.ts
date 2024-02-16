import { describe, expect, it, spyOn, mock } from 'bun:test'
import * as index from './index'
import { WibeApp } from '../server'
import { OperationType } from './index'

describe('Hooks', () => {
	it('should find and execute all the hooks and respect the priorities', async () => {
		const spy_findHooksByPriority = spyOn(index, '_findHooksByPriority')

		const mockCallbackOne = mock(() => {})
		const mockCallbackTwo = mock(() => {})

		WibeApp.config = {
			hooks: [
				{
					operationType: OperationType.BeforeInsert,
					priority: 0,
					callback: mockCallbackOne,
				},
				{
					operationType: OperationType.BeforeInsert,
					priority: 1,
					callback: mockCallbackTwo,
				},
			],
		} as any

		await index.findHooksAndExecute({
			className: '_User',
			data: [
				{
					name: 'tata',
				},
			],
			operationType: OperationType.BeforeInsert,
			user: {
				id: 'fakeId',
				email: 'fakeEmail',
			},
		})

		expect(mockCallbackOne).toHaveBeenCalledTimes(1)
		expect(mockCallbackTwo).toHaveBeenCalledTimes(1)
		expect(spy_findHooksByPriority.mock.calls[0][0].priority).toEqual(0)
		expect(spy_findHooksByPriority.mock.calls[1][0].priority).toEqual(1)
	})

	it('should only call the hooks that match with the triggered operation type', async () => {
		const spy_findHooksByPriority = spyOn(index, '_findHooksByPriority')

		const mockCallbackOne = mock(() => {})
		const mockCallbackTwo = mock(() => {})

		WibeApp.config = {
			hooks: [
				{
					operationType: OperationType.BeforeInsert,
					priority: 0,
					callback: mockCallbackOne,
				},
				{
					operationType: OperationType.AfterInsert,
					priority: 1,
					callback: mockCallbackTwo,
				},
			],
		} as any

		await index.findHooksAndExecute({
			className: '_User',
			data: [
				{
					name: 'tata',
				},
			],
			operationType: OperationType.BeforeInsert,
			user: {
				id: 'fakeId',
				email: 'fakeEmail',
			},
		})

		expect(mockCallbackOne).toHaveBeenCalledTimes(1)
		expect(mockCallbackTwo).toHaveBeenCalledTimes(0)
		expect(spy_findHooksByPriority.mock.calls[0][0].priority).toEqual(0)
	})
})
