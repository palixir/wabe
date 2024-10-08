import { describe, expect, it } from 'bun:test'
import { HookObject } from './HookObject'
import { OperationType } from '.'
import type { DevWabeTypes } from '../utils/helper'

describe('HookObject', () => {
  it('should return correctly value depends on the update state of the field', () => {
    const userData = { name: 'John Doe' }

    const hookObject = new HookObject<DevWabeTypes, 'User'>({
      className: 'User',
      // @ts-expect-error
      newData: userData,
      context: {} as any,
      operationType: OperationType.BeforeUpdate,
      object: {},
    })

    expect(hookObject.isFieldUpdate('name')).toBeTrue()
    expect(hookObject.isFieldUpdate('age')).toBeFalse()
  })

  it('should create a clone of the data', () => {
    const userData = { name: 'John Doe', age: 30 }

    const hookObject = new HookObject<DevWabeTypes, 'User'>({
      className: 'User',
      newData: userData as any,
      operationType: OperationType.BeforeCreate,
      context: {} as any,
      object: {},
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
      object: {},
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
