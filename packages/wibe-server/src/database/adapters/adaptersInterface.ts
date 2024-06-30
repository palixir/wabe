import type { WibeSchemaTypes } from '../../generated/wibe'
import type { Context } from '../../server/interface'

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

// TODO: It could be cool if fields type supports something like user.id, user.email
export interface GetObjectOptions<
	T extends keyof WibeSchemaTypes,
	K extends keyof WibeSchemaTypes[T],
> {
	className: T
	id: string
	fields?: Array<K>
	context: Context
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
	context: Context
	skipHooks?: boolean
}

export interface CreateObjectOptions<
	T extends keyof WibeSchemaTypes,
	K extends keyof WibeSchemaTypes[T],
	W extends keyof WibeSchemaTypes[T],
> {
	className: T
	data: Record<W, any>
	fields?: Array<K>
	context: Context
}
export interface CreateObjectsOptions<
	T extends keyof WibeSchemaTypes,
	K extends keyof WibeSchemaTypes[T],
	W extends keyof WibeSchemaTypes[T],
> {
	className: T
	data: Array<Record<W, any>>
	fields?: Array<K>
	offset?: number
	limit?: number
	context: Context
}

export interface UpdateObjectOptions<
	T extends keyof WibeSchemaTypes,
	K extends keyof WibeSchemaTypes[T],
	W extends keyof WibeSchemaTypes[T],
> {
	className: T
	id: string
	data: Record<W, any>
	fields?: Array<K>
	context: Context
}

export interface UpdateObjectsOptions<
	T extends keyof WibeSchemaTypes,
	K extends keyof WibeSchemaTypes[T],
	W extends keyof WibeSchemaTypes[T],
> {
	className: T
	where: WhereType<T>
	data: Record<W, any>
	fields?: Array<K>
	offset?: number
	limit?: number
	context: Context
}

export interface DeleteObjectOptions<
	T extends keyof WibeSchemaTypes,
	K extends keyof WibeSchemaTypes[T],
> {
	className: T
	id: string
	fields?: Array<K>
	context: Context
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
	context: Context
}

export interface DatabaseAdapter {
	connect(): Promise<any>
	close(): Promise<any>

	createClassIfNotExist(className: string): Promise<any>

	getObject<
		T extends keyof WibeSchemaTypes,
		K extends keyof WibeSchemaTypes[T],
	>(
		params: GetObjectOptions<T, K>,
	): Promise<Pick<WibeSchemaTypes[T], K> | null>
	getObjects<
		T extends keyof WibeSchemaTypes,
		K extends keyof WibeSchemaTypes[T],
	>(params: GetObjectsOptions<T, K>): Promise<Pick<WibeSchemaTypes[T], K>[]>

	createObject<
		T extends keyof WibeSchemaTypes,
		K extends keyof WibeSchemaTypes[T],
		W extends keyof WibeSchemaTypes[T],
	>(
		params: CreateObjectOptions<T, K, W>,
	): Promise<Pick<WibeSchemaTypes[T], K>>
	createObjects<
		T extends keyof WibeSchemaTypes,
		K extends keyof WibeSchemaTypes[T],
		W extends keyof WibeSchemaTypes[T],
	>(
		params: CreateObjectsOptions<T, K, W>,
	): Promise<Pick<WibeSchemaTypes[T], K>[]>

	updateObject<
		T extends keyof WibeSchemaTypes,
		K extends keyof WibeSchemaTypes[T],
		W extends keyof WibeSchemaTypes[T],
	>(
		params: UpdateObjectOptions<T, K, W>,
	): Promise<Pick<WibeSchemaTypes[T], K>>
	updateObjects<
		T extends keyof WibeSchemaTypes,
		K extends keyof WibeSchemaTypes[T],
		W extends keyof WibeSchemaTypes[T],
	>(
		params: UpdateObjectsOptions<T, K, W>,
	): Promise<Pick<WibeSchemaTypes[T], K>[]>

	deleteObject<
		T extends keyof WibeSchemaTypes,
		K extends keyof WibeSchemaTypes[T],
	>(params: DeleteObjectOptions<T, K>): Promise<void>
	deleteObjects<
		T extends keyof WibeSchemaTypes,
		K extends keyof WibeSchemaTypes[T],
	>(params: DeleteObjectsOptions<T, K>): Promise<void>
}
