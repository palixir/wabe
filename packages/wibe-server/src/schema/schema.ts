import { WibeSchemaScalars, WibeSchemaEnums } from '../../generated/wibe'

export type WibeDefaultTypes =
    | 'String'
    | 'Int'
    | 'Float'
    | 'Boolean'
    | 'Date'
    | 'Email'
    | 'Array'
    | 'Object'

export type WibeTypes = WibeSchemaScalars | WibeSchemaEnums | WibeDefaultTypes

type TypeFieldBase<T, K extends WibeTypes> = {
    type: K | WibeSchemaScalars | WibeSchemaEnums
    required?: boolean
    description?: string
    defaultValue?: T
}

// TODO: Add tests for defaultValue (need to be update in a before save event)
// TODO: Add created_at and updated_at fields (need to be update in a before save event)
export type TypeField =
    | TypeFieldBase<string, 'String'>
    | TypeFieldBase<number, 'Int'>
    | TypeFieldBase<number, 'Float'>
    | TypeFieldBase<boolean, 'Boolean'>
    | TypeFieldBase<Date, 'Date'>
    | TypeFieldBase<string, 'Email'>
    | {
          type: 'Array'
          required?: boolean
          description?: string
          defaultValue?: any[]
          typeValue: WibeTypes
      }
    | {
          type: 'Object'
          required?: boolean
          description?: string
          object: ClassInterface
      }

export type SchemaFields = Record<string, TypeField>

export type QueryResolver = {
    type: WibeTypes
    required?: boolean
    description?: string
    args?: {
        [key: string]: TypeField
    }
    resolve: (...args: any) => any
}

export type MutationResolver = {
    type: WibeTypes
    required?: boolean
    description?: string
    args?: {
        input: {
            [key: string]: TypeField
        }
    }
    resolve: (...args: any) => any
}

export type TypeResolver = {
    queries?: {
        [key: string]: QueryResolver
    }
    mutations?: {
        [key: string]: MutationResolver
    }
}

export interface ClassInterface {
    name: string
    fields: SchemaFields
    description?: string
    resolvers?: TypeResolver
}

export interface ScalarInterface {
    name: string
    description?: string
    parseValue?: (value: any) => any
    serialize?: (value: any) => any
    parseLiteral?: (ast: any) => any
}

export interface EnumInterface {
    name: string
    values: Record<string, string>
    description?: string
}

export interface SchemaInterface {
    class: ClassInterface[]
    scalars?: ScalarInterface[]
    enums?: EnumInterface[]
}

const wibeTypeToTypeScriptType: Record<any, string> = {
    String: 'string',
    Int: 'number',
    Float: 'number',
    Boolean: 'boolean',
    Date: 'Date',
    Array: 'any[]',
}

const getTypescriptFromWibeType = ({
    type,
    enums,
}: {
    type: WibeTypes
    enums: EnumInterface[]
}) => {
    const isEnum = enums.find((enumType) => enumType.name === type)
    if (isEnum) return type

    const typeScriptType = wibeTypeToTypeScriptType[type]
    if (!typeScriptType) return 'any'

    return typeScriptType
}

export class Schema {
    public schema: SchemaInterface

    constructor(schema: SchemaInterface) {
        this.schema = schema
    }
}
