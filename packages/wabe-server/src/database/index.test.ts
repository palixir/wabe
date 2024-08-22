import {
	afterAll,
	beforeAll,
	describe,
	expect,
	it,
	mock,
	spyOn,
	beforeEach,
	type Mock,
} from 'bun:test'
import type { WibeApp } from '../server'
import { type DevWibeAppTypes, setupTests, closeTests } from '../utils/helper'
import type { WibeContext } from '../server/interface'
import { OperationType, getDefaultHooks } from '../hooks'

describe('Database', () => {
	let wibe: WibeApp<DevWibeAppTypes>
	let context: WibeContext<any>

	const mockUpdateObject = mock(async () => {
		await context.wibeApp.databaseController.updateObjects({
			className: 'User',
			where: {
				name: { equalTo: 'Lucas' },
			},
			data: { age: 21 },
			context,
			fields: [],
		})
	})

	const mockAfterUpdate = mock(async () => {
		await context.wibeApp.databaseController.createObjects({
			className: 'Test2',
			data: [{ name: 'test' }],
			context,
			fields: [],
		})
	})

	let spyGetObjects: Mock<any>
	let spyGetObject: Mock<any>

	beforeAll(async () => {
		const setup = await setupTests()
		wibe = setup.wibe

		context = {
			isRoot: true,
			wibeApp: {
				databaseController: wibe.databaseController,
				config: wibe.config,
			},
		} as WibeContext<any>

		spyGetObjects = spyOn(wibe.databaseController, 'getObjects')
		spyGetObject = spyOn(wibe.databaseController, 'getObject')
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

		await wibe.databaseController.deleteObjects({
			// @ts-expect-error
			className: 'Test2',
			// @ts-expect-error
			where: { name: { equalTo: 'test2' } },
			context,
			fields: [],
		})

		wibe.config.hooks = getDefaultHooks()

		mockUpdateObject.mockClear()
		mockAfterUpdate.mockClear()
		spyGetObject.mockClear()
		spyGetObjects.mockClear()
	})

	it('should create object with subobject (hooks default call authentication before create user)', async () => {
		const res = await wibe.databaseController.createObject({
			className: 'User',
			context,
			fields: ['*'],
			data: {
				provider: 'Google',
				isOauth: true,
				authentication: {
					google: {
						email: 'email@test.fr',
						verifiedEmail: true,
						idToken: 'idToken',
					},
				},
			},
		})

		expect(res.authentication.google).toEqual({
			email: 'email@test.fr',
			verifiedEmail: true,
			idToken: 'idToken',
		})
	})

	it('should not computeObject in runOnSingleObject if there is no hooks to execute on createObject', async () => {
		wibe.config.hooks = []

		await wibe.databaseController.createObject({
			className: 'User',
			context,
			data: { name: 'Lucas' },
			fields: ['id'],
		})

		expect(spyGetObject).toHaveBeenCalledTimes(1)
	})

	it('should not computeObjects in runOnMultipleObjects if there is no hooks to execute on createObjects', async () => {
		wibe.config.hooks = []

		await wibe.databaseController.createObjects({
			className: 'User',
			context,
			data: [{ name: 'Lucas' }],
			fields: ['id'],
		})

		expect(spyGetObjects).toHaveBeenCalledTimes(1)
	})

	it('should not computeObject in runOnSingleObject if there is no hooks to execute on updateObject', async () => {
		wibe.config.hooks = []

		const { id } = await wibe.databaseController.createObject({
			className: 'User',
			context,
			data: { name: 'Lucas' },
			fields: ['id'],
		})

		spyGetObject.mockClear()

		await wibe.databaseController.updateObject({
			className: 'User',
			context,
			data: [{ name: 'Lucas' }],
			fields: ['id'],
			id,
		})

		expect(spyGetObject).toHaveBeenCalledTimes(1)
	})

	it('should not computeObject in runOnMultipleObject if there is no hooks to execute on updateObjects', async () => {
		wibe.config.hooks = []

		const { id } = await wibe.databaseController.createObject({
			className: 'User',
			context,
			data: { name: 'Lucas' },
			fields: ['id'],
		})

		spyGetObjects.mockClear()

		await wibe.databaseController.updateObjects({
			className: 'User',
			context,
			data: { name: 'Lucas' },
			fields: ['id'],
			where: { id: { equalTo: id } },
		})

		// Mongo adapter call 2 times getObjects in updateObjects
		expect(spyGetObjects).toHaveBeenCalledTimes(2)
	})

	it('should not computeObject in runOnSingleObject if there is no hooks to execute on updateObject', async () => {
		wibe.config.hooks = []

		const { id } = await wibe.databaseController.createObject({
			className: 'User',
			context,
			data: { name: 'Lucas' },
			fields: ['id'],
		})

		spyGetObject.mockClear()

		await wibe.databaseController.deleteObject({
			className: 'User',
			context,
			fields: ['id'],
			id,
		})

		expect(spyGetObject).toHaveBeenCalledTimes(1)
	})

	it('should not computeObject in runOnMultipleObject if there is no hooks to execute on updateObjects', async () => {
		wibe.config.hooks = []

		const { id } = await wibe.databaseController.createObject({
			className: 'User',
			context,
			data: { name: 'Lucas' },
			fields: ['id'],
		})

		spyGetObjects.mockClear()

		await wibe.databaseController.deleteObjects({
			className: 'User',
			context,
			fields: ['id'],
			where: { id: { equalTo: id } },
		})

		expect(spyGetObjects).toHaveBeenCalledTimes(1)
	})

	it('should call getObject adapter only 2 times (lower is better) for one read query (performance test) without mutation in hooks', async () => {
		wibe.config.hooks = [
			{
				className: 'User',
				operationType: OperationType.AfterCreate,
				callback: mockUpdateObject,
				priority: 1,
			},
			{
				className: 'Test2',
				operationType: OperationType.AfterUpdate,
				callback: mockAfterUpdate,
				priority: 1,
			},
		]
		const spyGetObjectAdapter = spyOn(
			wibe.databaseController.adapter,
			'getObject',
		)

		const res = await wibe.databaseController.createObject({
			className: 'User',
			context,
			data: { name: 'Lucas' },
			fields: ['id'],
		})

		spyGetObjectAdapter.mockClear()

		await wibe.databaseController.getObject({
			className: 'User',
			context,
			fields: ['id'],
			id: res.id,
		})

		expect(spyGetObjectAdapter).toHaveBeenCalledTimes(2)
	})

	it('should get the good value in output of createObject after mutation on after hook', async () => {
		wibe.config.hooks = [
			{
				className: 'User',
				operationType: OperationType.AfterCreate,
				callback: mockUpdateObject,
				priority: 1,
			},
			{
				className: 'Test2',
				operationType: OperationType.AfterUpdate,
				callback: mockAfterUpdate,
				priority: 1,
			},
		]
		const res = await context.wibeApp.databaseController.createObject({
			className: 'User',
			data: { name: 'Lucas', age: 20 },
			context,
			fields: ['age'],
		})

		expect(res.age).toEqual(21)

		expect(mockUpdateObject).toHaveBeenCalledTimes(1)
	})

	it('should get the good value in output of createObjects after mutation on after hook', async () => {
		wibe.config.hooks = [
			{
				className: 'User',
				operationType: OperationType.AfterCreate,
				callback: mockUpdateObject,
				priority: 1,
			},
			{
				className: 'Test2',
				operationType: OperationType.AfterUpdate,
				callback: mockAfterUpdate,
				priority: 1,
			},
		]
		const res = await context.wibeApp.databaseController.createObjects({
			className: 'User',
			data: [{ name: 'Lucas', age: 20 }],
			context,
			fields: ['age'],
		})

		expect(res[0].age).toEqual(21)

		expect(mockUpdateObject).toHaveBeenCalledTimes(1)
	})

	it('should get the good value in output of updateObjects after mutation on after hook', async () => {
		wibe.config.hooks = [
			{
				className: 'User',
				operationType: OperationType.AfterCreate,
				callback: mockUpdateObject,
				priority: 1,
			},
			{
				className: 'Test2',
				operationType: OperationType.AfterUpdate,
				callback: mockAfterUpdate,
				priority: 1,
			},
		]
		await context.wibeApp.databaseController.createObjects({
			className: 'Test2',
			data: [{ name: 'test', age: 20 }],
			context,
			fields: [],
		})

		const res = await context.wibeApp.databaseController.updateObjects({
			className: 'Test2',
			context,
			fields: ['name'],
			where: { name: { equalTo: 'test' } },
			data: { age: 20 },
		})

		expect(res.length).toEqual(1)

		expect(mockAfterUpdate).toHaveBeenCalledTimes(1)
	})

	it('should get the good value in output of updateObject after mutation on after hook', async () => {
		wibe.config.hooks = [
			{
				className: 'User',
				operationType: OperationType.AfterCreate,
				callback: mockUpdateObject,
				priority: 1,
			},
			{
				className: 'Test2',
				operationType: OperationType.AfterUpdate,
				callback: mockAfterUpdate,
				priority: 1,
			},
		]
		const res = await context.wibeApp.databaseController.createObjects({
			className: 'Test2',
			data: [{ name: 'test', age: 20 }],
			context,
			fields: ['id'],
		})

		const res2 = await context.wibeApp.databaseController.updateObject({
			className: 'Test2',
			context,
			fields: ['name'],
			data: { age: 20 },
			id: res[0].id,
		})

		expect(res2.name).toEqual('test')

		expect(mockAfterUpdate).toHaveBeenCalledTimes(1)
	})
})
