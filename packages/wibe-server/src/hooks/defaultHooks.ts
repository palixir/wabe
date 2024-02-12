import { WibeSchemaTypes } from '../../generated/wibe'
import { WibeApp } from '../server'
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

export const defaultBeforeInsertForDefaultValue = <
    T extends keyof WibeSchemaTypes,
    K extends keyof WibeSchemaTypes[T],
>(
    object: HookObject<T, K>,
) => {
    const schemaClass = WibeApp.config.schema.class.find(
        (schema) => schema.name === object.className,
    )

    if (!schemaClass) throw new Error('Class not found in schema')

    const allFields = Object.keys(schemaClass.fields)

    allFields.map((field) => {
        // @ts-expect-error
        if (!object.get({ field }))
            object.set({
                // @ts-expect-error
                field,
                // @ts-expect-error
                value: schemaClass?.fields[field].defaultValue,
            })
    })
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
