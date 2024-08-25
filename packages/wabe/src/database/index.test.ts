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
import type { Wabe } from '../server'
import { type DevWabeTypes, setupTests, closeTests } from '../utils/helper'
import type { WabeContext } from '../server/interface'
import { OperationType, getDefaultHooks } from '../hooks'

describe('Database', () => {
	let wabe: Wabe<DevWabeTypes>
	let context: WabeContext<any>

	const mockUpdateObject = mock(async () => {
		await context.wabe.controllers.database.updateObjects({
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
		await context.wabe.controllers.database.createObjects({
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
		wabe = setup.wabe

		context = {
			isRoot: true,
			wabe: {
				controllers: { database: wabe.controllers.database },
				config: wabe.config,
			},
		} as WabeContext<any>

		spyGetObjects = spyOn(wabe.controllers.database, 'getObjects')
		spyGetObject = spyOn(wabe.controllers.database, 'getObject')
	})

	afterAll(async () => {
		await closeTests(wabe)
	})

	beforeEach(async () => {
		await wabe.controllers.database.deleteObjects({
			className: 'User',
			where: { name: { equalTo: 'Lucas' } },
			context,
			fields: [],
		})

		await wabe.controllers.database.deleteObjects({
			// @ts-expect-error
			className: 'Test2',
			// @ts-expect-error
			where: { name: { equalTo: 'test2' } },
			context,
			fields: [],
		})

		wabe.config.hooks = getDefaultHooks()

		mockUpdateObject.mockClear()
		mockAfterUpdate.mockClear()
		spyGetObject.mockClear()
		spyGetObjects.mockClear()
	})

	it('should create object with subobject (hooks default call authentication before create user)', async () => {
		const res = await wabe.controllers.database.createObject({
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
		wabe.config.hooks = []

		await wabe.controllers.database.createObject({
			className: 'User',
			context,
			data: { name: 'Lucas' },
			fields: ['id'],
		})

		expect(spyGetObject).toHaveBeenCalledTimes(1)
	})

	it('should not computeObjects in runOnMultipleObjects if there is no hooks to execute on createObjects', async () => {
		wabe.config.hooks = []

		await wabe.controllers.database.createObjects({
			className: 'User',
			context,
			data: [{ name: 'Lucas' }],
			fields: ['id'],
		})

		expect(spyGetObjects).toHaveBeenCalledTimes(1)
	})

	it('should not computeObject in runOnSingleObject if there is no hooks to execute on updateObject', async () => {
		wabe.config.hooks = []

		const { id } = await wabe.controllers.database.createObject({
			className: 'User',
			context,
			data: { name: 'Lucas' },
			fields: ['id'],
		})

		spyGetObject.mockClear()

		await wabe.controllers.database.updateObject({
			className: 'User',
			context,
			data: [{ name: 'Lucas' }],
			fields: ['id'],
			id,
		})

		expect(spyGetObject).toHaveBeenCalledTimes(1)
	})

	it('should not computeObject in runOnMultipleObject if there is no hooks to execute on updateObjects', async () => {
		wabe.config.hooks = []

		const { id } = await wabe.controllers.database.createObject({
			className: 'User',
			context,
			data: { name: 'Lucas' },
			fields: ['id'],
		})

		spyGetObjects.mockClear()

		await wabe.controllers.database.updateObjects({
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
		wabe.config.hooks = []

		const { id } = await wabe.controllers.database.createObject({
			className: 'User',
			context,
			data: { name: 'Lucas' },
			fields: ['id'],
		})

		spyGetObject.mockClear()

		await wabe.controllers.database.deleteObject({
			className: 'User',
			context,
			fields: ['id'],
			id,
		})

		expect(spyGetObject).toHaveBeenCalledTimes(1)
	})

	it('should not computeObject in runOnMultipleObject if there is no hooks to execute on updateObjects', async () => {
		wabe.config.hooks = []

		const { id } = await wabe.controllers.database.createObject({
			className: 'User',
			context,
			data: { name: 'Lucas' },
			fields: ['id'],
		})

		spyGetObjects.mockClear()

		await wabe.controllers.database.deleteObjects({
			className: 'User',
			context,
			fields: ['id'],
			where: { id: { equalTo: id } },
		})

		expect(spyGetObjects).toHaveBeenCalledTimes(1)
	})

	it('should call getObject adapter only 2 times (lower is better) for one read query (performance test) without mutation in hooks', async () => {
		wabe.config.hooks = [
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
			wabe.controllers.database.adapter,
			'getObject',
		)

		const res = await wabe.controllers.database.createObject({
			className: 'User',
			context,
			data: { name: 'Lucas' },
			fields: ['id'],
		})

		spyGetObjectAdapter.mockClear()

		await wabe.controllers.database.getObject({
			className: 'User',
			context,
			fields: ['id'],
			id: res.id,
		})

		expect(spyGetObjectAdapter).toHaveBeenCalledTimes(2)
	})

	it('should get the good value in output of createObject after mutation on after hook', async () => {
		wabe.config.hooks = [
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
		const res = await context.wabe.controllers.database.createObject({
			className: 'User',
			data: { name: 'Lucas', age: 20 },
			context,
			fields: ['age'],
		})

		expect(res.age).toEqual(21)

		expect(mockUpdateObject).toHaveBeenCalledTimes(1)
	})

	it('should get the good value in output of createObjects after mutation on after hook', async () => {
		wabe.config.hooks = [
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
		const res = await context.wabe.controllers.database.createObjects({
			className: 'User',
			data: [{ name: 'Lucas', age: 20 }],
			context,
			fields: ['age'],
		})

		expect(res[0].age).toEqual(21)

		expect(mockUpdateObject).toHaveBeenCalledTimes(1)
	})

	it('should get the good value in output of updateObjects after mutation on after hook', async () => {
		wabe.config.hooks = [
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
		await context.wabe.controllers.database.createObjects({
			className: 'Test2',
			data: [{ name: 'test', age: 20 }],
			context,
			fields: [],
		})

		const res = await context.wabe.controllers.database.updateObjects({
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
		wabe.config.hooks = [
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
		const res = await context.wabe.controllers.database.createObjects({
			className: 'Test2',
			data: [{ name: 'test', age: 20 }],
			context,
			fields: ['id'],
		})

		const res2 = await context.wabe.controllers.database.updateObject({
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
