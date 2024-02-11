import {
    describe,
    it,
    expect,
    spyOn,
    beforeAll,
    afterAll,
    mock,
} from 'bun:test'
import { ObjectId } from 'mongodb'
import { MongoAdapter } from '../adapters/MongoAdapter'
import { closeTests, setupTests } from '../../utils/helper'
import { WibeApp } from '../../server'
import * as databaseController from './DatabaseController'
import { HookTrigger } from '../../hooks'

describe('DatabaseController', () => {
    let wibe: WibeApp

    beforeAll(async () => {
        const setup = await setupTests()
        wibe = setup.wibe
    })

    afterAll(async () => {
        await closeTests(wibe)
    })

    it('should call adapter for createClass', async () => {
        const spyMongoAdapterCreateClass = spyOn(
            MongoAdapter.prototype,
            'createClass',
        ).mockResolvedValue()

        await WibeApp.databaseController.createClass('Collection1')

        expect(spyMongoAdapterCreateClass).toHaveBeenCalledTimes(1)
    })

    it('should find and execute all the hook with undefined className', async () => {
        const mockCallbackOne = mock(() => {})
        const mockCallbackTwo = mock(() => {})

        WibeApp.config.hooks = [
            {
                trigger: HookTrigger.BeforeInsert,
                priority: 1,
                callback: mockCallbackOne as any,
            },
            {
                trigger: HookTrigger.AfterInsert,
                priority: 1,
                callback: mockCallbackTwo as any,
            },
        ]

        await databaseController._findHooksAndExecute({
            className: '_User',
            data: {
                name: 'tata',
            },
            hookTrigger: HookTrigger.BeforeInsert,
        })

        expect(mockCallbackTwo).toHaveBeenCalledTimes(0)
        expect(mockCallbackOne).toHaveBeenCalledTimes(1)
        expect(mockCallbackOne).toHaveBeenCalledWith({
            className: '_User',
            data: {
                name: 'tata',
            },
        })

        await databaseController._findHooksAndExecute({
            className: '_User',
            data: {
                id: 'id' as any,
            },
            hookTrigger: HookTrigger.AfterInsert,
        })

        expect(mockCallbackTwo).toHaveBeenCalledTimes(1)
        expect(mockCallbackTwo).toHaveBeenCalledWith({
            className: '_User',
            data: {
                id: 'id',
            },
        })
    })

    it('should find and execute all the hook with className', async () => {
        const mockCallbackOne = mock(() => {})
        const mockCallbackTwo = mock(() => {})

        WibeApp.config.hooks = [
            {
                trigger: HookTrigger.BeforeInsert,
                className: '_User',
                priority: 1,
                callback: mockCallbackOne as any,
            },
            {
                trigger: HookTrigger.AfterInsert,
                className: 'Tata',
                priority: 1,
                callback: mockCallbackTwo as any,
            },
        ]

        await databaseController._findHooksAndExecute({
            className: '_User',
            data: {
                name: 'tata',
            },
            hookTrigger: HookTrigger.BeforeInsert,
        })

        expect(mockCallbackTwo).toHaveBeenCalledTimes(0)
        expect(mockCallbackOne).toHaveBeenCalledTimes(1)
        expect(mockCallbackOne).toHaveBeenCalledWith({
            className: '_User',
            data: {
                name: 'tata',
            },
        })

        await databaseController._findHooksAndExecute({
            className: '_User',
            data: {
                id: 'id' as any,
            },
            hookTrigger: HookTrigger.AfterInsert,
        })

        expect(mockCallbackTwo).toHaveBeenCalledTimes(0)

        await databaseController._findHooksAndExecute({
            // @ts-expect-error
            className: 'Tata',
            data: {
                id: 'id' as any,
            },
            hookTrigger: HookTrigger.AfterInsert,
        })

        expect(mockCallbackTwo).toHaveBeenCalledTimes(1)
    })

    it('should find and execute all the hooks and respect the priorities', async () => {
        const spy_findHooksByPriority = spyOn(
            databaseController,
            '_findHooksByPriority',
        )

        const mockCallbackOne = mock(() => {})
        const mockCallbackTwo = mock(() => {})

        WibeApp.config.hooks = [
            {
                trigger: HookTrigger.BeforeInsert,
                priority: 0,
                callback: mockCallbackOne,
            },
            {
                trigger: HookTrigger.BeforeInsert,
                priority: 1,
                callback: mockCallbackTwo,
            },
        ]

        await databaseController._findHooksAndExecute({
            className: '_User',
            data: {
                name: 'tata',
            },
            hookTrigger: HookTrigger.BeforeInsert,
        })

        expect(mockCallbackOne).toHaveBeenCalledTimes(1)
        expect(mockCallbackTwo).toHaveBeenCalledTimes(1)
        expect(spy_findHooksByPriority.mock.calls[0][0].priority).toEqual(0)
        expect(spy_findHooksByPriority.mock.calls[1][0].priority).toEqual(1)
    })

    it('should call hook on createObject', async () => {
        const spy_findHooksAndExecute = spyOn(
            databaseController,
            '_findHooksAndExecute',
        )

        await WibeApp.databaseController.createObject({
            className: '_User',
            data: {
                name: 'John Doe',
            },
        })

        expect(spy_findHooksAndExecute).toHaveBeenCalledTimes(2)
        expect(spy_findHooksAndExecute).toHaveBeenNthCalledWith(1, {
            hookTrigger: 'beforeInsert',
            className: '_User',
            data: {
                name: 'John Doe',
                _id: expect.any(ObjectId),
            },
        })
        expect(spy_findHooksAndExecute).toHaveBeenNthCalledWith(2, {
            hookTrigger: 'afterInsert',
            className: '_User',
            data: {
                name: 'John Doe',
                _id: expect.any(ObjectId),
            },
        })

        spy_findHooksAndExecute.mockRestore()
    })

    it('should call hook on updateObject', async () => {
        const spy_findHooksAndExecute = spyOn(
            databaseController,
            '_findHooksAndExecute',
        )

        const res = await WibeApp.databaseController.createObject({
            className: '_User',
            data: {
                name: 'John Doe',
            },
        })

        spy_findHooksAndExecute.mockReset()

        await WibeApp.databaseController.updateObject({
            className: '_User',
            id: res.id,
            data: {
                name: 'John Doe',
            },
        })

        expect(spy_findHooksAndExecute).toHaveBeenCalledTimes(2)
        expect(spy_findHooksAndExecute).toHaveBeenNthCalledWith(1, {
            hookTrigger: 'beforeUpdate',
            className: '_User',
            data: {
                name: 'John Doe',
            },
        })
        expect(spy_findHooksAndExecute).toHaveBeenNthCalledWith(2, {
            hookTrigger: 'afterUpdate',
            className: '_User',
        })

        spy_findHooksAndExecute.mockRestore()
    })

    it('should call hook on deleteObject', async () => {
        const spy_findHooksAndExecute = spyOn(
            databaseController,
            '_findHooksAndExecute',
        )

        const res = await WibeApp.databaseController.createObject({
            className: '_User',
            data: {
                name: 'John Doe',
            },
        })

        spy_findHooksAndExecute.mockReset()

        await WibeApp.databaseController.deleteObject({
            className: '_User',
            id: res.id,
        })

        expect(spy_findHooksAndExecute).toHaveBeenCalledTimes(2)
        expect(spy_findHooksAndExecute).toHaveBeenNthCalledWith(1, {
            hookTrigger: 'beforeDelete',
            className: '_User',
            data: {},
        })
        expect(spy_findHooksAndExecute).toHaveBeenNthCalledWith(2, {
            hookTrigger: 'afterDelete',
            className: '_User',
        })

        spy_findHooksAndExecute.mockRestore()
    })
})
