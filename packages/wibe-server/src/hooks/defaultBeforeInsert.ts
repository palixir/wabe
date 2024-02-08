import { HookBeforeInsert } from '.'
import { WibeSchemaTypes } from '../../generated/wibe'

export const defaultBeforeInsertCallback = <
    T extends keyof WibeSchemaTypes,
    K extends keyof WibeSchemaTypes[T],
>({
    object,
    fields,
}: HookBeforeInsert<T, K>) => {
    // @ts-expect-error
    object.set({ field: 'createdAt', value: new Date() })
}
