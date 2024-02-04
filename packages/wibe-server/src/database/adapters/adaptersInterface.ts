import { WibeSchemaTypes, _User } from '../../../generated/wibe'

type WhereAggregation<
    T extends keyof WibeSchemaTypes,
    K extends keyof WibeSchemaTypes[T],
> = {
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

type WhereConditional<
    T extends keyof WibeSchemaTypes,
    K extends keyof WibeSchemaTypes[T],
> = {
    OR?: Array<WhereType<T>>
    AND?: Array<WhereType<T>>
}

export type WhereType<
    T extends keyof WibeSchemaTypes,
    K extends keyof WibeSchemaTypes[T],
> = Partial<WhereAggregation<T>> & WhereConditional<T>

export interface AdapterOptions {
    databaseUrl: string
    databaseName: string
}

export type FieldTata<T> = Partial<Pick<T, keyof T>>

export interface GetObjectOptions<
    T extends keyof WibeSchemaTypes,
    K extends keyof WibeSchemaTypes[T],
> {
    className: string
    id: string
    fields?: Array<K>
}

export interface GetObjectsOptions<
    T extends keyof WibeSchemaTypes,
    K extends keyof WibeSchemaTypes[T],
> {
    className: string
    where?: WhereType<T>
    fields?: Array<K>
    offset?: number
    limit?: number
}

export interface CreateObjectOptions<
    T extends keyof WibeSchemaTypes,
    K extends keyof WibeSchemaTypes[T],
> {
    className: string
    data: Record<string, any>
    fields?: Array<K>
}
export interface CreateObjectsOptions<
    T extends keyof WibeSchemaTypes,
    K extends keyof WibeSchemaTypes[T],
> {
    className: string
    data: Array<Record<string, any>>
    fields?: Array<K>
    offset?: number
    limit?: number
}

export interface UpdateObjectOptions<
    T extends keyof WibeSchemaTypes,
    K extends keyof WibeSchemaTypes[T],
> {
    className: string
    id: string
    data: Record<string, any>
    fields?: Array<K>
}

export interface UpdateObjectsOptions<
    T extends keyof WibeSchemaTypes,
    K extends keyof WibeSchemaTypes[T],
> {
    className: string
    where: WhereType<T>
    data: Record<string, any>
    fields?: Array<K>
    offset?: number
    limit?: number
}

export interface DeleteObjectOptions<
    T extends keyof WibeSchemaTypes,
    K extends keyof WibeSchemaTypes[T],
> {
    className: string
    id: string
    fields?: Array<K>
}

export interface DeleteObjectsOptions<
    T extends keyof WibeSchemaTypes,
    K extends keyof WibeSchemaTypes[T],
> {
    className: string
    where: WhereType<T>
    fields?: Array<K>
    offset?: number
    limit?: number
}

const toto = <
    T extends keyof WibeSchemaTypes,
    K extends keyof WibeSchemaTypes[T],
    K extends Array<keyof T>,
>(): Pick<T, K[number]> => {}

const res = toto<_User, ['name', 'age']>()
res.age

export interface DatabaseAdapter {
    connect(): Promise<any>
    close(): Promise<any>

    createClass(className: string): Promise<any>

    getObject<
        T extends keyof WibeSchemaTypes,
        K extends keyof WibeSchemaTypes[T],
    >(
        params: GetObjectOptions<T>,
    ): Promise<Pick<WibeSchemaTypes[T], K> | null>
    getObjects<
        T extends keyof WibeSchemaTypes,
        K extends keyof WibeSchemaTypes[T],
    >(
        params: GetObjectsOptions<T>,
    ): Promise<Pick<WibeSchemaTypes[T], K>[]>

    createObject<
        T extends keyof WibeSchemaTypes,
        K extends keyof WibeSchemaTypes[T],
    >(
        params: CreateObjectOptions<T>,
    ): Promise<Pick<WibeSchemaTypes[T], K>>
    createObjects<
        T extends keyof WibeSchemaTypes,
        K extends keyof WibeSchemaTypes[T],
    >(
        params: CreateObjectsOptions<T>,
    ): Promise<Pick<WibeSchemaTypes[T], K>[]>

    updateObject<
        T extends keyof WibeSchemaTypes,
        K extends keyof WibeSchemaTypes[T],
    >(
        params: UpdateObjectOptions<T>,
    ): Promise<Pick<WibeSchemaTypes[T], K>>
    updateObjects<
        T extends keyof WibeSchemaTypes,
        K extends keyof WibeSchemaTypes[T],
    >(
        params: UpdateObjectsOptions<T>,
    ): Promise<Pick<WibeSchemaTypes[T], K>[]>

    deleteObject<
        T extends keyof WibeSchemaTypes,
        K extends keyof WibeSchemaTypes[T],
    >(
        params: DeleteObjectOptions<T>,
    ): Promise<Pick<WibeSchemaTypes[T], K> | null>
    deleteObjects<
        T extends keyof WibeSchemaTypes,
        K extends keyof WibeSchemaTypes[T],
    >(
        params: DeleteObjectsOptions<T>,
    ): Promise<Pick<WibeSchemaTypes[T], K>[]>
}
