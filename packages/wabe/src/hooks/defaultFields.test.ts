import { describe, expect, it, spyOn } from 'bun:test'
import {
  defaultBeforeCreateForCreatedAt,
  defaultBeforeCreateForDefaultValue,
  defaultBeforeUpdateForUpdatedAt,
} from './defaultFields'
import { HookObject } from './HookObject'
import { OperationType } from '.'
import type { DevWabeTypes } from '../utils/helper'

describe('Default fields', () => {
  const now = new Date()

  describe('CreatedAt and UpdatedAt', () => {
    it('should add createdAt and updatedAt value on insert operation type', async () => {
      const hookObject = new HookObject<DevWabeTypes>({
        className: 'User',
        operationType: OperationType.BeforeCreate,
        newData: {
          email: 'email@test.fr',
        } as any,
        context: {} as any,
        object: {} as any,
      })

      const spyHookObjectUpsertNewData = spyOn(hookObject, 'upsertNewData')

      await defaultBeforeCreateForCreatedAt(hookObject)

      expect(spyHookObjectUpsertNewData).toHaveBeenCalledTimes(2)
      expect(spyHookObjectUpsertNewData).toHaveBeenNthCalledWith(
        1,
        'createdAt',
        expect.any(Date),
      )
      expect(spyHookObjectUpsertNewData).toHaveBeenNthCalledWith(
        2,
        'updatedAt',
        expect.any(Date),
      )

      const createdAt = spyHookObjectUpsertNewData.mock.calls[0][1]

      expect(createdAt.getDay()).toEqual(now.getDay())
      expect(createdAt.getMonth()).toEqual(now.getMonth())
      expect(createdAt.getFullYear()).toEqual(now.getFullYear())

      const updatedAt = spyHookObjectUpsertNewData.mock.calls[1][1]
      expect(updatedAt.getDay()).toEqual(now.getDay())
      expect(updatedAt.getMonth()).toEqual(now.getMonth())
      expect(updatedAt.getFullYear()).toEqual(now.getFullYear())
    })

    it('shoud add updatedAt value on update operation type', async () => {
      const hookObject = new HookObject<DevWabeTypes>({
        className: 'User',
        operationType: OperationType.BeforeUpdate,
        newData: {
          email: 'email@test.fr',
        } as any,
        context: {} as any,
        object: {} as any,
      })

      const spyHookObjectUpsertNewData = spyOn(hookObject, 'upsertNewData')

      await defaultBeforeUpdateForUpdatedAt(hookObject)
      expect(spyHookObjectUpsertNewData).toHaveBeenCalledTimes(1)
      expect(spyHookObjectUpsertNewData).toHaveBeenCalledWith(
        'updatedAt',
        expect.any(Date),
      )

      const updatedAt = spyHookObjectUpsertNewData.mock.calls[0][1]

      // Don't test hours to avoid flaky
      expect(updatedAt.getDay()).toEqual(now.getDay())
      expect(updatedAt.getMonth()).toEqual(now.getMonth())
      expect(updatedAt.getFullYear()).toEqual(now.getFullYear())
    })

    it('should not overwrite if the createdAt field is already set', async () => {
      const hookObject = new HookObject<DevWabeTypes>({
        className: 'User',
        operationType: OperationType.BeforeCreate,
        newData: {
          email: 'email@test.fr',
          createdAt: now,
        } as any,
        context: {} as any,
        object: {} as any,
      })

      const spyHookObjectUpsertNewData = spyOn(hookObject, 'upsertNewData')

      await defaultBeforeCreateForCreatedAt(hookObject)

      expect(spyHookObjectUpsertNewData).toHaveBeenCalledTimes(1)
    })

    it('should not overwrite if the updatedAt field is already set', async () => {
      const hookObject = new HookObject<DevWabeTypes>({
        className: 'User',
        operationType: OperationType.BeforeCreate,
        newData: {
          email: 'email@test.fr',
          updatedAt: now,
        } as any,
        context: {} as any,
        object: {} as any,
      })

      const spyHookObjectUpsertNewData = spyOn(hookObject, 'upsertNewData')

      await defaultBeforeCreateForCreatedAt(hookObject)

      expect(spyHookObjectUpsertNewData).toHaveBeenCalledTimes(1)
    })
  })

  describe('Default value', () => {
    const config = {
      schema: {
        classes: [
          {
            name: 'User',
            fields: {
              name: { type: 'String' },
              age: { type: 'Int' },
              isAdmin: {
                type: 'Boolean',
                defaultValue: false,
              },
            },
          },
        ],
      },
    } as any

    const context = { wabe: { config } } as any

    it('should add the value if a default value is defined in schema but not specified', async () => {
      const hookObject = new HookObject<DevWabeTypes>({
        className: 'User',
        operationType: OperationType.BeforeCreate,
        newData: {
          id: 'id',
          email: 'email@test.fr',
        } as any,
        context,
        object: {} as any,
      })

      const spyHookObjectUpsertNewData = spyOn(hookObject, 'upsertNewData')

      await defaultBeforeCreateForDefaultValue(hookObject)

      expect(spyHookObjectUpsertNewData).toHaveBeenCalledTimes(1)
    })

    it('should not add a default value if a value is specified', async () => {
      const hookObject = new HookObject<DevWabeTypes>({
        className: 'User',
        operationType: OperationType.BeforeCreate,
        newData: {
          id: 'id',
          email: 'email@test.fr',
          isAdmin: true,
        } as any,
        context,
        object: {} as any,
      })

      const spyHookObjectUpsertNewData = spyOn(hookObject, 'upsertNewData')

      await defaultBeforeCreateForDefaultValue(hookObject)

      expect(spyHookObjectUpsertNewData).toHaveBeenCalledTimes(0)
    })
  })
})
