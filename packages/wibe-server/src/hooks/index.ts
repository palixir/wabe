import { WibeSchemaTypes } from '../../generated/wibe'
import { HookObject } from './HookObject'
import {
    defaultBeforeInsertForCreatedAt,
    defaultBeforeUpdateForUpdatedAt,
} from './defaultHooks'

export enum HookTrigger {
    BeforeInsert = 'beforeInsert',
    AfterInsert = 'afterInsert',
    BeforeUpdate = 'beforeUpdate',
    AfterUpdate = 'afterUpdate',
    BeforeDelete = 'beforeDelete',
    AfterDelete = 'afterDelete',
}

export interface ObjectTrigger<
    T extends keyof WibeSchemaTypes,
    K extends keyof WibeSchemaTypes[T],
> {
    _data: Readonly<Record<K, WibeSchemaTypes[T][K]>>
    get: (options: { field: K }) => Readonly<WibeSchemaTypes[T][K]>
    set: (options: { field: K; value: WibeSchemaTypes[T][K] }) => void
    className: Readonly<T>
}

export type Hook<
    T extends keyof WibeSchemaTypes,
    K extends keyof WibeSchemaTypes[T],
> = {
    trigger: HookTrigger
    // If the className is undefined the hook is called on each class
    className?: T
    callback: (hookObject: HookObject<T, K>) => Promise<void> | void
}

export const defaultHooks: Hook<any, any>[] = [
    {
        trigger: HookTrigger.BeforeInsert,
        callback: defaultBeforeInsertForCreatedAt,
    },
    {
        trigger: HookTrigger.BeforeUpdate,
        callback: defaultBeforeUpdateForUpdatedAt,
    },
]
