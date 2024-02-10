import { WibeSchemaTypes } from '../../generated/wibe'
import { HookObject } from './HookObject'

export const defaultBeforeInsertForCreatedAt = <
    T extends keyof WibeSchemaTypes,
    K extends keyof WibeSchemaTypes[T],
>(
    object: HookObject<T, K>,
) => {
    // @ts-expect-error
    object.set({ field: 'createdAt', value: new Date() })
}

export const defaultBeforeUpdateForUpdatedAt = <
    T extends keyof WibeSchemaTypes,
    K extends keyof WibeSchemaTypes[T],
>(
    object: HookObject<T, K>,
) => {
    // @ts-expect-error
    object.set({ field: 'updatedAt', value: new Date() })
}
