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

export const defaultBeforeInsertForDefaultValue = <
    T extends keyof WibeSchemaTypes,
    K extends keyof WibeSchemaTypes[T],
>(
    object: HookObject<T, K>,
) => {
    // TODO : Clear class first element is empty
    // const schemaClass = WibeApp.config.schema.class.find(
    //     (schema) => schema.name === object.className,
    // )
    // const allFields = Object.keys(schemaClass?.fields)
    // const res = allFields.map((field) => {
    //     return schemaClass?.fields[field].defaultValue
    // })
    // console.log(res)
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
