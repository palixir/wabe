import { WibeSchemaTypes } from '../../generated/wibe'
import { WibeApp } from '../server'
import { defaultBeforeInsertCallback } from './defaultBeforeInsert'

export enum HookTrigger {
    BeforeInsert = 'beforeInsert',
    AfterInsert = 'afterInsert',
    BeforeUpdate = 'beforeUpdate',
    AfterUpdate = 'afterUpdate',
    BeforeDelete = 'beforeDelete',
    AfterDelete = 'afterDelete',
}

export interface HookTriggerObject<
    T extends keyof WibeSchemaTypes,
    K extends keyof WibeSchemaTypes[T],
> {
    className: Readonly<T>
    data: Readonly<Record<K, any>>
    fields?: Readonly<Array<K>>
}

export interface HookBeforeInsert<
    T extends keyof WibeSchemaTypes,
    K extends keyof WibeSchemaTypes[T],
> extends HookTriggerObject<T, K> {}

export interface HookAfterInsert<
    T extends keyof WibeSchemaTypes,
    K extends keyof WibeSchemaTypes[T],
> extends HookTriggerObject<T, K> {
    insertedObject: Readonly<Pick<WibeSchemaTypes[T], K>>
}

export interface HookBeforeUpdate<
    T extends keyof WibeSchemaTypes,
    K extends keyof WibeSchemaTypes[T],
> extends HookTriggerObject<T, K> {}

export interface HookAfterUpdate<
    T extends keyof WibeSchemaTypes,
    K extends keyof WibeSchemaTypes[T],
> extends HookTriggerObject<T, K> {
    updatedObject: Readonly<Pick<WibeSchemaTypes[T], K>>
}

export interface HookBeforeDelete<
    T extends keyof WibeSchemaTypes,
    K extends keyof WibeSchemaTypes[T],
> {
    className: Readonly<T>
    id: Readonly<string>
    fields?: Readonly<Array<K>>
}

export interface HookAfterDelete<
    T extends keyof WibeSchemaTypes,
    K extends keyof WibeSchemaTypes[T],
> extends HookTriggerObject<T, K> {
    deletedObject: Readonly<Pick<WibeSchemaTypes[T], K>>
}

export type Hook =
    | {
          trigger: HookTrigger.BeforeInsert
          callback: <
              T extends keyof WibeSchemaTypes,
              K extends keyof WibeSchemaTypes[T],
          >(
              object: HookBeforeInsert<T, K>,
          ) => void
      }
    | {
          trigger: HookTrigger.BeforeDelete
          callback: <
              T extends keyof WibeSchemaTypes,
              K extends keyof WibeSchemaTypes[T],
          >(
              object: HookBeforeDelete<T, K>,
          ) => void
      }
    | {
          trigger: HookTrigger.BeforeUpdate
          callback: <
              T extends keyof WibeSchemaTypes,
              K extends keyof WibeSchemaTypes[T],
          >(
              object: HookBeforeUpdate<T, K>,
          ) => void
      }
    | {
          trigger: HookTrigger.AfterInsert
          callback: <
              T extends keyof WibeSchemaTypes,
              K extends keyof WibeSchemaTypes[T],
          >(
              object: HookAfterInsert<T, K>,
          ) => void
      }
    | {
          trigger: HookTrigger.AfterDelete
          callback: <
              T extends keyof WibeSchemaTypes,
              K extends keyof WibeSchemaTypes[T],
          >(
              object: HookAfterDelete<T, K>,
          ) => void
      }
    | {
          trigger: HookTrigger.AfterUpdate
          callback: <
              T extends keyof WibeSchemaTypes,
              K extends keyof WibeSchemaTypes[T],
          >(
              object: HookAfterUpdate<T, K>,
          ) => void
      }

const defaultHooks: Hook[] = [
    {
        trigger: HookTrigger.BeforeInsert,
        callback: defaultBeforeInsertCallback,
    },
]

export const computeHooks = (hooks: Hook[]) => {
    hooks.map((hook) => WibeApp.eventEmitter.on(hook.trigger, hook.callback))
}
