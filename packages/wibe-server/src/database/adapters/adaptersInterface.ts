import { WibeSchemaTypes, _User } from '../../../generated/wibe'

type WhereAggregation<T extends keyof WibeSchemaTypes> = {
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

type WhereConditional<T extends keyof WibeSchemaTypes> = {
    OR?: Array<WhereType<T>>
    AND?: Array<WhereType<T>>
}

export type WhereType<T extends keyof WibeSchemaTypes> = Partial<
    WhereAggregation<T>
> &
    WhereConditional<T>

export interface AdapterOptions {
    databaseUrl: string
    databaseName: string
}

export type FieldTata<T> = Partial<Pick<T, keyof T>>

export interface GetObjectOptions<
    T extends keyof WibeSchemaTypes,
    K extends keyof WibeSchemaTypes[T],
> {
    className: T
    id: string
    fields?: Array<K>
}

export interface GetObjectsOptions<
    T extends keyof WibeSchemaTypes,
    K extends keyof WibeSchemaTypes[T],
> {
    className: T
    where?: WhereType<T>
    fields?: Array<K>
    offset?: number
    limit?: number
}

export interface CreateObjectOptions<
    T extends keyof WibeSchemaTypes,
    K extends keyof WibeSchemaTypes[T],
> {
    className: T
    data: Record<string, any>
    fields?: Array<K>
}
export interface CreateObjectsOptions<
    T extends keyof WibeSchemaTypes,
    K extends keyof WibeSchemaTypes[T],
> {
    className: T
    data: Array<Record<string, any>>
    fields?: Array<K>
    offset?: number
    limit?: number
}

export interface UpdateObjectOptions<
    T extends keyof WibeSchemaTypes,
    K extends keyof WibeSchemaTypes[T],
> {
    className: T
    id: string
    data: Record<string, any>
    fields?: Array<K>
}

export interface UpdateObjectsOptions<
    T extends keyof WibeSchemaTypes,
    K extends keyof WibeSchemaTypes[T],
> {
    className: T
    where: WhereType<T, K>
    data: Record<string, any>
    fields?: Array<K>
    offset?: number
    limit?: number
}

export interface DeleteObjectOptions<
    T extends keyof WibeSchemaTypes,
    K extends keyof WibeSchemaTypes[T],
> {
    className: T
    id: string
    fields?: Array<K>
}

export interface DeleteObjectsOptions<
    T extends keyof WibeSchemaTypes,
    K extends keyof WibeSchemaTypes[T],
> {
    className: T
    where: WhereType<T>
    fields?: Array<K>
    offset?: number
    limit?: number
}

export interface DatabaseAdapter {
    connect(): Promise<any>
    close(): Promise<any>

    createClass(className: string): Promise<any>

    getObject<
        T extends keyof WibeSchemaTypes,
        K extends keyof WibeSchemaTypes[T],
    >(
        params: GetObjectOptions<T, K>,
    ): Promise<Pick<WibeSchemaTypes[T], K> | null>
    getObjects<
        T extends keyof WibeSchemaTypes,
        K extends keyof WibeSchemaTypes[T],
    >(
        params: GetObjectsOptions<T, K>,
    ): Promise<Pick<WibeSchemaTypes[T], K>[]>

    createObject<
        T extends keyof WibeSchemaTypes,
        K extends keyof WibeSchemaTypes[T],
    >(
        params: CreateObjectOptions<T, K>,
    ): Promise<Pick<WibeSchemaTypes[T], K>>
    createObjects<
        T extends keyof WibeSchemaTypes,
        K extends keyof WibeSchemaTypes[T],
    >(
        params: CreateObjectsOptions<T, K>,
    ): Promise<Pick<WibeSchemaTypes[T], K>[]>

    updateObject<
        T extends keyof WibeSchemaTypes,
        K extends keyof WibeSchemaTypes[T],
    >(
        params: UpdateObjectOptions<T, K>,
    ): Promise<Pick<WibeSchemaTypes[T], K>>
    updateObjects<
        T extends keyof WibeSchemaTypes,
        K extends keyof WibeSchemaTypes[T],
    >(
        params: UpdateObjectsOptions<T, K>,
    ): Promise<Pick<WibeSchemaTypes[T], K>[]>

    deleteObject<
        T extends keyof WibeSchemaTypes,
        K extends keyof WibeSchemaTypes[T],
    >(
        params: DeleteObjectOptions<T, K>,
    ): Promise<Pick<WibeSchemaTypes[T], K> | null>
    deleteObjects<
        T extends keyof WibeSchemaTypes,
        K extends keyof WibeSchemaTypes[T],
    >(
        params: DeleteObjectsOptions<T, K>,
    ): Promise<Pick<WibeSchemaTypes[T], K>[]>
}
