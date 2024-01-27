import { WibeSchemaTypes } from '../../../generated/wibe'

type WhereAggregation<T extends keyof WibeSchemaTypes> = {
    [key in keyof WibeSchemaTypes[T] | 'id']: {
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

export interface GetObjectOptions<T extends keyof WibeSchemaTypes> {
    className: string
    id: string
    fields: Array<keyof WibeSchemaTypes[T] | '*' | 'id'>
}

export interface GetObjectsOptions<T extends keyof WibeSchemaTypes> {
    className: string
    where?: WhereType<T>
    fields: Array<keyof WibeSchemaTypes[T] | '*' | 'id'>
    offset?: number
    limit?: number
}

export interface CreateObjectOptions<T extends keyof WibeSchemaTypes> {
    className: string
    data: Record<string, any>
    fields: Array<keyof WibeSchemaTypes[T] | '*' | 'id'>
}
export interface CreateObjectsOptions<T extends keyof WibeSchemaTypes> {
    className: string
    data: Array<Record<string, any>>
    fields: Array<keyof WibeSchemaTypes[T] | '*' | 'id'>
    offset?: number
    limit?: number
}

export interface UpdateObjectOptions<T extends keyof WibeSchemaTypes> {
    className: string
    id: string
    data: Record<string, any>
    fields: Array<keyof WibeSchemaTypes[T] | '*' | 'id'>
}

export interface UpdateObjectsOptions<T extends keyof WibeSchemaTypes> {
    className: string
    where: WhereType<T>
    data: Record<string, any>
    fields: Array<keyof WibeSchemaTypes[T] | '*' | 'id'>
    offset?: number
    limit?: number
}

export interface DeleteObjectOptions<T extends keyof WibeSchemaTypes> {
    className: string
    id: string
    fields: Array<keyof WibeSchemaTypes[T] | '*' | 'id'>
}

export interface DeleteObjectsOptions<T extends keyof WibeSchemaTypes> {
    className: string
    where: WhereType<T>
    fields: Array<keyof WibeSchemaTypes[T] | '*' | 'id'>
    offset?: number
    limit?: number
}

// TODO : Type the return of the functions
export interface DatabaseAdapter {
    connect(): Promise<any>
    close(): Promise<any>

    createClass(className: string): Promise<any>

    getObject<T extends keyof WibeSchemaTypes>(
        params: GetObjectOptions<T>,
    ): Promise<T>
    getObjects<T extends keyof WibeSchemaTypes>(
        params: GetObjectsOptions<T>,
    ): Promise<T[]>

    createObject<T extends keyof WibeSchemaTypes>(
        params: CreateObjectOptions<T>,
    ): Promise<T>
    createObjects<T extends keyof WibeSchemaTypes>(
        params: CreateObjectsOptions<T>,
    ): Promise<T[]>

    updateObject<T extends keyof WibeSchemaTypes>(
        params: UpdateObjectOptions<T>,
    ): Promise<T>
    updateObjects<T extends keyof WibeSchemaTypes>(
        params: UpdateObjectsOptions<T>,
    ): Promise<T[]>

    deleteObject<T extends keyof WibeSchemaTypes>(
        params: DeleteObjectOptions<T>,
    ): Promise<T | null>
    deleteObjects<T extends keyof WibeSchemaTypes>(
        params: DeleteObjectsOptions<T>,
    ): Promise<T[]>
}
