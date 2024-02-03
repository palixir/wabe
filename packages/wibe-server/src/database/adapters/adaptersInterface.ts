import { WibeSchemaTypes, _User } from '../../../generated/wibe'

type WhereAggregation<T extends WibeSchemaTypes> = {
    [key in keyof T | 'id']: {
        equalTo?: any
        notEqualTo?: any
        greaterThan?: any
        lessThan?: any
        greaterThanOrEqualTo?: any
        lessThanOrEqualTo?: any
        in?: any[]
        notIn?: any[]
        contains?: any
        notContains?: any
    }
}

type WhereConditional<T extends WibeSchemaTypes> = {
    OR?: Array<WhereType<T>>
    AND?: Array<WhereType<T>>
}

export type WhereType<T extends WibeSchemaTypes> = Partial<
    WhereAggregation<T>
> &
    WhereConditional<T>

export interface AdapterOptions {
    databaseUrl: string
    databaseName: string
}

export type FieldTata<T> = Partial<Pick<T, keyof T>>

export interface GetObjectOptions<T extends WibeSchemaTypes> {
    className: string
    id: string
    fields: Array<keyof T | '*' | 'id'>
}

export interface GetObjectsOptions<T extends WibeSchemaTypes> {
    className: string
    where?: WhereType<T>
    fields: Array<keyof T | '*' | 'id'>
    offset?: number
    limit?: number
}

export interface CreateObjectOptions<T extends WibeSchemaTypes> {
    className: string
    data: Record<string, any>
    fields: Array<keyof T | '*' | 'id'>
}
export interface CreateObjectsOptions<T extends WibeSchemaTypes> {
    className: string
    data: Array<Record<string, any>>
    fields: Array<keyof T | '*' | 'id'>
    offset?: number
    limit?: number
}

export interface UpdateObjectOptions<T extends WibeSchemaTypes> {
    className: string
    id: string
    data: Record<string, any>
    fields: Array<keyof T | '*' | 'id'>
}

export interface UpdateObjectsOptions<T extends WibeSchemaTypes> {
    className: string
    where: WhereType<T>
    data: Record<string, any>
    fields: Array<keyof T | '*' | 'id'>
    offset?: number
    limit?: number
}

export interface DeleteObjectOptions<T extends WibeSchemaTypes> {
    className: string
    id: string
    fields: Array<keyof T | '*' | 'id'>
}

export interface DeleteObjectsOptions<T extends WibeSchemaTypes> {
    className: string
    where: WhereType<T>
    fields: Array<keyof T | '*' | 'id'>
    offset?: number
    limit?: number
}

const toto = <T extends WibeSchemaTypes, K extends Array<keyof T>>(): Pick<
    T,
    K[number]
> => {}

const res = toto<_User, ['name', 'age']>()
res.age

export interface DatabaseAdapter {
    connect(): Promise<any>
    close(): Promise<any>

    createClass(className: string): Promise<any>

    getObject<T extends WibeSchemaTypes>(
        params: GetObjectOptions<T>,
    ): Promise<FieldTata<T> | null>
    getObjects<T extends WibeSchemaTypes>(
        params: GetObjectsOptions<T>,
    ): Promise<Partial<T>[]>

    createObject<T extends WibeSchemaTypes>(
        params: CreateObjectOptions<T>,
    ): Promise<Partial<T>>
    createObjects<T extends WibeSchemaTypes>(
        params: CreateObjectsOptions<T>,
    ): Promise<Partial<T>[]>

    updateObject<T extends WibeSchemaTypes>(
        params: UpdateObjectOptions<T>,
    ): Promise<Partial<T>>
    updateObjects<T extends WibeSchemaTypes>(
        params: UpdateObjectsOptions<T>,
    ): Promise<Partial<T>[]>

    deleteObject<T extends WibeSchemaTypes>(
        params: DeleteObjectOptions<T>,
    ): Promise<Partial<T> | null>
    deleteObjects<T extends WibeSchemaTypes>(
        params: DeleteObjectsOptions<T>,
    ): Promise<Partial<T>[]>
}
