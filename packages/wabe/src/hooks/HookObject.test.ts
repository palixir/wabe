import { describe, expect, it, beforeAll, afterAll } from 'bun:test'
import { HookObject } from './HookObject'
import { OperationType } from '.'
import { closeTests, setupTests, type DevWabeTypes } from '../utils/helper'
import type { Wabe } from '../server'

describe('HookObject', () => {
  let wabe: Wabe<DevWabeTypes>

  beforeAll(async () => {
    const setup = await setupTests()
    wabe = setup.wabe
  })

  afterAll(async () => {
    await closeTests(wabe)
  })

  it('should fetch all the fields of an object', async () => {
    const res = await wabe.controllers.database.createObject({
      className: 'User',
      data: { age: 30, name: 'John Doe' },
      context: {
        wabe,
        isRoot: true,
      },
      fields: ['id'],
    })

    const hookObject = new HookObject<DevWabeTypes, 'User'>({
      className: 'User',
      // @ts-expect-error
      newData: { age: 30, name: 'John Doe' },
      context: {
        wabe,
      } as any,
      operationType: OperationType.BeforeCreate,
      object: {
        id: res?.id || 'id',
      },
    })

    const fetchResult = await hookObject.fetch()

    expect(fetchResult).toEqual(
      expect.objectContaining({
        id: res?.id || 'id',
        age: 30,
        name: 'John Doe',
      }),
    )
  })

  it('should return correctly value depends on the update state of the field', () => {
    const userData = { name: 'John Doe' }

    const hookObject = new HookObject<DevWabeTypes, 'User'>({
      className: 'User',
      // @ts-expect-error
      newData: userData,
      context: {} as any,
      operationType: OperationType.BeforeUpdate,
      object: {
        id: '1',
      },
    })

    expect(hookObject.isFieldUpdated('name')).toBeTrue()
    expect(hookObject.isFieldUpdated('age')).toBeFalse()
  })

  it('should create a clone of the data', () => {
    const userData = { name: 'John Doe', age: 30 }

    const hookObject = new HookObject<DevWabeTypes, 'User'>({
      className: 'User',
      newData: userData as any,
      operationType: OperationType.BeforeCreate,
      context: {} as any,
      object: {
        id: '1',
      },
    })

    hookObject.upsertNewData('name', 'tata')

    expect(hookObject.getNewData()).toEqual(
      expect.objectContaining({
        name: 'tata',
        age: 30,
      }),
    )
  })

  it('should not set data for an after hook', () => {
    const userData = { name: 'John Doe', age: 30 }

    const hookObject = new HookObject({
      className: 'User',
      newData: userData as any,
      operationType: OperationType.AfterCreate,
      context: {} as any,
      object: {
        id: '1',
      },
    })

    expect(() => hookObject.upsertNewData('name', 'tata')).toThrow(
      'Cannot set data in a hook that is not a before hook',
    )

    expect(hookObject.getNewData()).toEqual({
      name: 'John Doe',
      age: 30,
    })
  })
})
