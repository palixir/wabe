import { HookBeforeInsert } from '.'
import { WibeSchemaTypes } from '../../generated/wibe'

export const defaultBeforeInsertCallback = <
    T extends keyof WibeSchemaTypes,
    K extends keyof WibeSchemaTypes[T],
>(
    object: HookBeforeInsert<T, K>,
) => {}
