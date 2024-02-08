import {
  describe,
  it,
  expect,
  spyOn,
  beforeAll,
  afterAll,
  mock
} from 'bun:test'
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

  it("should find and execute all the hook", async () => {
    const mockCallbackOne = mock(() => { })
    const mockCallbackTwo = mock(() => { })

    WibeApp.config.hooks = [
      {
        trigger: HookTrigger.BeforeInsert,
        callback: mockCallbackOne as any
      },
      {
        trigger: HookTrigger.AfterInsert,
        callback: mockCallbackTwo as any
      }
    ]

    await databaseController._findHooksAndExecute({
      className: '_User',
      data: {
        name: 'tata'
      },
      hookTrigger: HookTrigger.BeforeInsert
    })

    expect(mockCallbackTwo).toHaveBeenCalledTimes(0)
    expect(mockCallbackOne).toHaveBeenCalledTimes(1)
    expect(mockCallbackOne).toHaveBeenCalledWith({
      className: '_User',
      data: {
        name: 'tata'
      }
    })

    await databaseController._findHooksAndExecute({
      className: '_User',
      data: {
        id: 'id' as any
      },
      hookTrigger: HookTrigger.AfterInsert
    })

    expect(mockCallbackTwo).toHaveBeenCalledTimes(1)
    expect(mockCallbackTwo).toHaveBeenCalledWith({
      className: '_User',
      data: {
        id: 'id'
      }
    })
  })

  it("should call hook on createObject", async () => {
    const spy_findHooksAndExecute = spyOn(
      databaseController,
      '_findHooksAndExecute').mockResolvedValue({
        _id: 'id'
      } as any)

    await WibeApp.databaseController.createObject({
      className: '_User',
      data: {
        name: 'John Doe',
      }
    })

    expect(spy_findHooksAndExecute).toHaveBeenCalledTimes(2)
    expect(spy_findHooksAndExecute).toHaveBeenNthCalledWith(1, {
      hookTrigger: 'beforeInsert',
      className: '_User',
      data: {
        name: 'John Doe',
      }
    })
    expect(spy_findHooksAndExecute).toHaveBeenNthCalledWith(2, {
      hookTrigger: 'afterInsert',
      className: '_User',
      data: {
        _id: 'id',
      }
    })

    spy_findHooksAndExecute.mockRestore()
  })
})
