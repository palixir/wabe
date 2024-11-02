import type { MutationData, OutputType, WhereType } from '../database'
import {
  defaultBeforeCreateUpload,
  defaultBeforeUpdateUpload,
} from '../files/hookUploadFile'
import type { WabeConfig, WabeTypes } from '../server'
import type { WabeContext } from '../server/interface'
import type { DevWabeTypes } from '../utils/helper'
import { HookObject } from './HookObject'
import {
  defaultCallAuthenticationProviderOnBeforeCreateUser,
  defaultCallAuthenticationProviderOnBeforeUpdateUser,
} from './authentication'
import {
  defaultBeforeCreateForCreatedAt,
  defaultBeforeCreateForDefaultValue,
  defaultBeforeUpdateForUpdatedAt,
} from './defaultFields'
import { defaultDeleteSessionOnDeleteUser } from './deleteSession'
import {
  defaultCheckPermissionOnCreate,
  defaultCheckPermissionOnDelete,
  defaultCheckPermissionOnRead,
  defaultCheckPermissionOnUpdate,
} from './permissions'
import {
  defaultSearchableFieldsBeforeCreate,
  defaultSearchableFieldsBeforeUpdate,
} from './searchableFields'
import { defaultSetEmail, defaultSetEmailOnUpdate } from './setEmail'
import {
  defaultSetupAclBeforeCreate,
  defaultSetupAclOnUserAfterCreate,
} from './setupAcl'

export enum OperationType {
  AfterCreate = 'afterCreate',
  AfterUpdate = 'afterUpdate',
  AfterDelete = 'afterDelete',
  AfterRead = 'afterRead',
  BeforeCreate = 'beforeCreate',
  BeforeUpdate = 'beforeUpdate',
  BeforeDelete = 'beforeDelete',
  BeforeRead = 'beforeRead',
}

export type Hook<T extends WabeTypes, K extends keyof WabeTypes['types']> = {
  operationType: OperationType
  // If the className is undefined the hook is called on each class
  className?: K
  // The priority of the hook. The lower the number the earlier the hook is called
  // The priority 0 is for the security hooks
  // The default priority is 1
  priority: number
  callback: (hookObject: HookObject<T, K>) => Promise<void> | void
}

export const _findHooksByPriority = async <T extends keyof WabeTypes['types']>({
  className,
  operationType,
  priority,
  config,
}: {
  operationType: OperationType
  className: T
  priority: number
  config: WabeConfig<any>
}) =>
  config.hooks?.filter(
    (hook) =>
      hook.operationType === operationType &&
      hook.priority === priority &&
      (className === hook.className || !hook.className),
  ) || []

const _getHooksOrderByPriorities = (config: WabeConfig<any>) =>
  config.hooks
    ?.reduce((acc, hook) => {
      if (!acc.includes(hook.priority)) acc.push(hook.priority)

      return acc
    }, [] as number[])
    .sort((a, b) => a - b) || []

export const initializeHook = <
  T extends WabeTypes,
  K extends keyof T['types'],
>({
  className,
  newData,
  context,
}: {
  className: K
  newData?: MutationData<DevWabeTypes, any, any>
  context: WabeContext<any>
}) => {
  const computeObject = ({
    id,
    object,
    operationType,
  }: {
    id?: string
    object?: OutputType<DevWabeTypes, any, any>
    operationType: OperationType
  }): Promise<OutputType<DevWabeTypes, any, any>> => {
    if (object) return Promise.resolve(object)

    // @ts-expect-error
    if (operationType === OperationType.BeforeCreate) return newData

    if (!id) throw new Error('Object not found')

    return context.wabe.controllers.database.getObject({
      className,
      context: {
        ...context,
        isRoot: true,
      },
      id,
      skipHooks: true,
      fields: ['*'],
    })
  }

  const computeObjects = async ({
    objects,
    operationType,
    where,
  }: {
    where?: WhereType<DevWabeTypes, any>
    objects?: OutputType<DevWabeTypes, any, any>[]
    operationType: OperationType
  }): Promise<OutputType<DevWabeTypes, any, any>[]> => {
    if (objects) return objects

    // @ts-expect-error
    if (operationType === OperationType.BeforeCreate) return [newData]

    const res = await context.wabe.controllers.database.getObjects({
      className,
      context: {
        ...context,
        isRoot: true,
      },
      where,
      fields: ['*'],
      skipHooks: true,
    })

    // @ts-expect-error
    if (res.length === 0) return [{}]

    return res
  }

  const hooksOrderByPriorities = _getHooksOrderByPriorities(context.wabe.config)

  return {
    runOnSingleObject: async ({
      operationType,
      id,
      object: inputObject,
    }: {
      operationType: OperationType
      id?: string
      object?: OutputType<DevWabeTypes, any, any>
    }): Promise<MutationData<T, K, any>> => {
      if (hooksOrderByPriorities.length === 0)
        return { object: undefined, newData: {} }

      const object = await computeObject({
        id,
        operationType,
        object: inputObject,
      })

      const hookObject = new HookObject<DevWabeTypes, K>({
        className,
        newData,
        operationType,
        context,
        // @ts-expect-error
        object,
      })

      // We need to keep the order of the data but we need to execute the hooks in parallel
      await hooksOrderByPriorities.reduce(async (acc, priority) => {
        await acc

        const hooksToCompute = await _findHooksByPriority({
          className,
          operationType,
          priority,
          config: context.wabe.config,
        })

        await Promise.all(
          hooksToCompute.map((hook) => hook.callback(hookObject)),
        )
      }, Promise.resolve())

      return { object, newData: hookObject.getNewData() }
    },

    runOnMultipleObjects: async ({
      operationType,
      where,
      objects: inputObjects,
    }: {
      operationType: OperationType
      where?: WhereType<any, any>
      objects?: OutputType<DevWabeTypes, any, any>[]
    }) => {
      if (hooksOrderByPriorities.length === 0)
        return { objects: [], newData: [newData || {}] }

      const objects = await computeObjects({
        where,
        operationType,
        objects: inputObjects,
      })

      const newDataAfterHooks = await Promise.all(
        objects.map(async (object) => {
          const hookObject = new HookObject<DevWabeTypes, K>({
            className,
            newData,
            operationType,
            context,
            // @ts-expect-error
            object,
          })

          // We need to keep the order of the data but we need to execute the hooks in parallel
          await hooksOrderByPriorities.reduce(async (acc, priority) => {
            await acc

            const hooksToCompute = await _findHooksByPriority({
              className,
              operationType,
              priority,
              config: context.wabe.config,
            })

            await Promise.all(
              hooksToCompute.map((hook) => hook.callback(hookObject)),
            )
          }, Promise.resolve())

          return hookObject.getNewData()
        }),
      )

      return { objects, newData: newDataAfterHooks }
    },
  }
}

export const getDefaultHooks = (): Hook<any, any>[] => [
  {
    operationType: OperationType.BeforeRead,
    priority: 0,
    callback: defaultCheckPermissionOnRead,
  },
  {
    operationType: OperationType.BeforeUpdate,
    priority: 0,
    callback: defaultCheckPermissionOnUpdate,
  },
  {
    operationType: OperationType.BeforeCreate,
    priority: 0,
    callback: defaultCheckPermissionOnCreate,
  },
  {
    operationType: OperationType.BeforeDelete,
    priority: 0,
    callback: defaultCheckPermissionOnDelete,
  },
  {
    operationType: OperationType.BeforeCreate,
    priority: 1,
    callback: defaultBeforeCreateForCreatedAt,
  },
  {
    operationType: OperationType.BeforeCreate,
    priority: 1,
    callback: defaultBeforeCreateForDefaultValue,
  },
  {
    operationType: OperationType.BeforeUpdate,
    priority: 1,
    callback: defaultBeforeUpdateForUpdatedAt,
  },
  {
    operationType: OperationType.BeforeCreate,
    priority: 1,
    callback: defaultBeforeCreateUpload,
  },
  {
    operationType: OperationType.BeforeUpdate,
    priority: 1,
    callback: defaultBeforeUpdateUpload,
  },
  {
    className: 'User',
    operationType: OperationType.BeforeCreate,
    priority: 1,
    callback: defaultCallAuthenticationProviderOnBeforeCreateUser,
  },
  {
    className: 'User',
    operationType: OperationType.BeforeUpdate,
    priority: 1,
    callback: defaultCallAuthenticationProviderOnBeforeUpdateUser,
  },
  {
    operationType: OperationType.BeforeCreate,
    // Need to be after email setup
    priority: 2,
    callback: defaultSearchableFieldsBeforeCreate,
  },
  {
    operationType: OperationType.BeforeUpdate,
    // Need to be after email setup
    priority: 2,
    callback: defaultSearchableFieldsBeforeUpdate,
  },
  {
    operationType: OperationType.BeforeCreate,
    priority: 0,
    callback: defaultSetupAclBeforeCreate,
  },
  {
    className: 'User',
    operationType: OperationType.AfterCreate,
    priority: 0,
    callback: defaultSetupAclOnUserAfterCreate,
  },
  {
    className: 'User',
    operationType: OperationType.BeforeCreate,
    priority: 1,
    callback: defaultSetEmail,
  },
  {
    className: 'User',
    operationType: OperationType.BeforeUpdate,
    priority: 1,
    callback: defaultSetEmailOnUpdate,
  },
  {
    className: 'User',
    // TODO: It should better to do this in after delete to avoid case when deleteUser failed
    // For the moment KISS
    operationType: OperationType.BeforeDelete,
    priority: 1,
    callback: defaultDeleteSessionOnDeleteUser,
  },
]
