import {
  describe,
  it,
  expect,
  spyOn,
  beforeAll,
  afterAll,
  afterEach,
} from 'bun:test'
import { MongoAdapter } from '../adapters/MongoAdapter'
import { closeTests, setupTests } from '../../utils/helper'
import { WibeApp } from '../../server'
import { CreateObjectOptions } from '../adapters/adaptersInterface'

describe('DatabaseController', () => {
  let wibe: WibeApp
  let spyWibeEmitterEmit

  beforeAll(async () => {
    const setup = await setupTests()
    wibe = setup.wibe
    spyWibeEmitterEmit = spyOn(WibeApp.eventEmitter, 'emit')
  })

  afterAll(async () => {
    await closeTests(wibe)
  })

  afterEach(() => {
    spyWibeEmitterEmit.mockReset()
  })

  it('should call adapter for createClass', async () => {
    const spyMongoAdapterCreateClass = spyOn(
      MongoAdapter.prototype,
      'createClass',
    ).mockResolvedValue()

    await WibeApp.databaseController.createClass('Collection1')

    expect(spyMongoAdapterCreateClass).toHaveBeenCalledTimes(1)
  })

  it('should call wibeEmitter on createObject', async () => {
    const spyMongoAdapterCreateObject = spyOn(
      MongoAdapter.prototype,
      'createObject',
    ).mockResolvedValue({
      id: '123',
      name: 'test',
    } as any)

    await WibeApp.databaseController.createObject({
      className: '_User',
      data: {
        name: 'test',
        age: 20,
      },
      fields: ['name', 'age'],
    } as CreateObjectOptions<any, any>)

    expect(spyWibeEmitterEmit).toHaveBeenCalledTimes(2)

    expect(spyWibeEmitterEmit).toHaveBeenNthCalledWith(1, 'beforeInsert', {
      className: '_User',
      data: {
        name: 'test',
        age: 20,
      },
      fields: ['name', 'age'],
    })

    expect(spyWibeEmitterEmit).toHaveBeenNthCalledWith(2, 'afterInsert', {
      className: '_User',
      data: {
        name: 'test',
        age: 20,
      },
      fields: ['name', 'age'],
      insertedObject: {
        id: '123',
        name: 'test',
      },
    })

    expect(spyMongoAdapterCreateObject).toHaveBeenCalledTimes(1)

    spyWibeEmitterEmit.mockReset()
    spyMongoAdapterCreateObject.mockRestore()
  })

  it('should call wibeEmitter on updateObject', async () => {
    const spyMongoAdapterUpdateObject = spyOn(
      MongoAdapter.prototype,
      'updateObject',
    ).mockResolvedValue({
      id: '123',
      name: 'test',
    } as any)

    await WibeApp.databaseController.updateObject({
      className: '_User',
      id: '123',
      data: {
        name: 'test',
        age: 20,
      },
      fields: ['name', 'age'],
    })

    expect(spyWibeEmitterEmit).toHaveBeenCalledTimes(2)

    expect(spyWibeEmitterEmit).toHaveBeenNthCalledWith(1, 'beforeUpdate', {
      className: '_User',
      id: '123',
      data: {
        name: 'test',
        age: 20,
      },
      fields: ['name', 'age'],
    })

    expect(spyWibeEmitterEmit).toHaveBeenNthCalledWith(2, 'afterUpdate', {
      className: '_User',
      id: '123',
      data: {
        name: 'test',
        age: 20,
      },
      fields: ['name', 'age'],
      updatedObject: {
        id: '123',
        name: 'test',
      },
    })

    expect(spyMongoAdapterUpdateObject).toHaveBeenCalledTimes(1)

    spyMongoAdapterUpdateObject.mockRestore()
  })

  it('should call wibeEmitter on deleteObject', async () => {
    const spyMongoAdapterDeleteObject = spyOn(
      MongoAdapter.prototype,
      'deleteObject',
    ).mockResolvedValue({
      id: '123',
      name: 'test',
    })

    await WibeApp.databaseController.deleteObject({
      className: '_User',
      id: '123',
    })

    expect(spyWibeEmitterEmit).toHaveBeenCalledTimes(2)

    expect(spyWibeEmitterEmit).toHaveBeenNthCalledWith(1, 'beforeDelete', {
      className: '_User',
      id: '123',
    })
    expect(spyWibeEmitterEmit).toHaveBeenNthCalledWith(2, 'afterDelete', {
      className: '_User',
      id: '123',
      deletedObject: {
        id: '123',
        name: 'test',
      },
    })

    expect(spyMongoAdapterDeleteObject).toHaveBeenCalledTimes(1)

    spyMongoAdapterDeleteObject.mockRestore()
  })
})
