import { WibeSchemaTypes } from '../../generated/wibe'
import { WibeApp } from '../server'
import { HookObject } from './HookObject'
import { defaultBeforeInsertCallback } from './defaultBeforeInsert'

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

export interface HookTriggerObject<
  T extends keyof WibeSchemaTypes,
  K extends keyof WibeSchemaTypes[T],
> {
  className: Readonly<T>
  data: Readonly<Record<K, WibeSchemaTypes[T][K]>>
  fields?: Readonly<Array<K>>
}

export interface HookBeforeInsert<
  T extends keyof WibeSchemaTypes,
  K extends keyof WibeSchemaTypes[T],
> extends HookTriggerObject<T, K> { }

export interface HookAfterInsert<
  T extends keyof WibeSchemaTypes,
  K extends keyof WibeSchemaTypes[T],
> extends HookTriggerObject<T, K> {
  insertedObject: Readonly<Pick<WibeSchemaTypes[T], K>>
}

export interface HookBeforeUpdate<
  T extends keyof WibeSchemaTypes,
  K extends keyof WibeSchemaTypes[T],
> extends HookTriggerObject<T, K> { }

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

export type Hook = {
  trigger: HookTrigger
  callback: <
    T extends keyof WibeSchemaTypes,
    K extends keyof WibeSchemaTypes[T],
  >(hookObject: HookObject<T, K>) => Promise<void>
}

// const defaultHooks: Hook[] = [
//   {
//     trigger: HookTrigger.BeforeInsert,
//     callback: defaultBeforeInsertCallback,
//   },
// ]
