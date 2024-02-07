import { WibeSchemaTypes } from '../../generated/wibe'
import { WibeApp } from '../server'

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
> extends HookBeforeInsert<T, K> {
    insertedObject: Readonly<Pick<WibeSchemaTypes[T], K>>
}

export interface HookBeforeUpdate<
    T extends keyof WibeSchemaTypes,
    K extends keyof WibeSchemaTypes[T],
> extends HookTriggerObject<T, K> {}

export interface HookAfterUpdate<
    T extends keyof WibeSchemaTypes,
    K extends keyof WibeSchemaTypes[T],
> extends HookBeforeUpdate<T, K> {
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
> extends HookBeforeDelete<T, K> {
    deletedObject: Readonly<Pick<WibeSchemaTypes[T], K>>
}

export interface Hook {
    trigger: HookTrigger
    callback: (...args: any[]) => void
}

export const computeHooks = (hooks: Hook[]) => {
    hooks.map((hook) => WibeApp.eventEmitter.on(hook.trigger, hook.callback))
}
