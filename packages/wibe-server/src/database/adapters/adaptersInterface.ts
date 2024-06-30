import type { Context } from '../../server/interface'
import type { WibeAppTypes } from '../../server'

type WhereAggregation<T extends keyof WibeAppTypes['types']> = {
	[key in keyof WibeAppTypes['types'][T] | 'id']: {
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

type WhereConditional<T extends keyof WibeAppTypes['types']> = {
	OR?: Array<WhereType<T>>
	AND?: Array<WhereType<T>>
}

export type WhereType<T extends keyof WibeAppTypes['types']> = Partial<
	WhereAggregation<T>
> &
	WhereConditional<T>

export interface AdapterOptions {
	databaseUrl: string
	databaseName: string
}

// TODO: It could be cool if fields type supports something like user.id, user.email
export interface GetObjectOptions<
	T extends keyof WibeAppTypes['types'],
	K extends keyof WibeAppTypes['types'][T],
> {
	className: T
	id: string
	fields?: Array<K>
	context: Context<any>
}

export interface GetObjectsOptions<
	T extends keyof WibeAppTypes['types'],
	K extends keyof WibeAppTypes['types'][T],
> {
	className: T
	where?: WhereType<T>
	fields?: Array<K>
	offset?: number
	limit?: number
	context: Context<any>
	skipHooks?: boolean
}

export interface CreateObjectOptions<
	T extends keyof WibeAppTypes['types'],
	K extends keyof WibeAppTypes['types'][T],
	W extends keyof WibeAppTypes['types'][T],
> {
	className: T
	data: Record<W, any>
	fields?: Array<K>
	context: Context<any>
}
export interface CreateObjectsOptions<
	T extends keyof WibeAppTypes['types'],
	K extends keyof WibeAppTypes['types'][T],
	W extends keyof WibeAppTypes['types'][T],
> {
	className: T
	data: Array<Record<W, any>>
	fields?: Array<K>
	offset?: number
	limit?: number
	context: Context<any>
}

export interface UpdateObjectOptions<
	T extends keyof WibeAppTypes['types'],
	K extends keyof WibeAppTypes['types'][T],
	W extends keyof WibeAppTypes['types'][T],
> {
	className: T
	id: string
	data: Record<W, any>
	fields?: Array<K>
	context: Context<any>
}

export interface UpdateObjectsOptions<
	T extends keyof WibeAppTypes['types'],
	K extends keyof WibeAppTypes['types'][T],
	W extends keyof WibeAppTypes['types'][T],
> {
	className: T
	where: WhereType<T>
	data: Record<W, any>
	fields?: Array<K>
	offset?: number
	limit?: number
	context: Context<any>
}

export interface DeleteObjectOptions<
	T extends keyof WibeAppTypes['types'],
	K extends keyof WibeAppTypes['types'][T],
> {
	className: T
	id: string
	fields?: Array<K>
	context: Context<any>
}

export interface DeleteObjectsOptions<
	T extends keyof WibeAppTypes['types'],
	K extends keyof WibeAppTypes['types'][T],
> {
	className: T
	where: WhereType<T>
	fields?: Array<K>
	offset?: number
	limit?: number
	context: Context<any>
}

export interface DatabaseAdapter {
	connect(): Promise<any>
	close(): Promise<any>

	createClassIfNotExist(className: string): Promise<any>

	getObject<
		T extends keyof WibeAppTypes['types'],
		K extends keyof WibeAppTypes['types'][T],
	>(
		params: GetObjectOptions<T, K>,
	): Promise<Pick<WibeAppTypes['types'][T], K> | null>
	getObjects<
		T extends keyof WibeAppTypes['types'],
		K extends keyof WibeAppTypes['types'][T],
	>(
		params: GetObjectsOptions<T, K>,
	): Promise<Pick<WibeAppTypes['types'][T], K>[]>

	createObject<
		T extends keyof WibeAppTypes['types'],
		K extends keyof WibeAppTypes['types'][T],
		W extends keyof WibeAppTypes['types'][T],
	>(
		params: CreateObjectOptions<T, K, W>,
	): Promise<Pick<WibeAppTypes['types'][T], K>>
	createObjects<
		T extends keyof WibeAppTypes['types'],
		K extends keyof WibeAppTypes['types'][T],
		W extends keyof WibeAppTypes['types'][T],
	>(
		params: CreateObjectsOptions<T, K, W>,
	): Promise<Pick<WibeAppTypes['types'][T], K>[]>

	updateObject<
		T extends keyof WibeAppTypes['types'],
		K extends keyof WibeAppTypes['types'][T],
		W extends keyof WibeAppTypes['types'][T],
	>(
		params: UpdateObjectOptions<T, K, W>,
	): Promise<Pick<WibeAppTypes['types'][T], K>>
	updateObjects<
		T extends keyof WibeAppTypes['types'],
		K extends keyof WibeAppTypes['types'][T],
		W extends keyof WibeAppTypes['types'][T],
	>(
		params: UpdateObjectsOptions<T, K, W>,
	): Promise<Pick<WibeAppTypes['types'][T], K>[]>

	deleteObject<
		T extends keyof WibeAppTypes['types'],
		K extends keyof WibeAppTypes['types'][T],
	>(params: DeleteObjectOptions<T, K>): Promise<void>
	deleteObjects<
		T extends keyof WibeAppTypes['types'],
		K extends keyof WibeAppTypes['types'][T],
	>(params: DeleteObjectsOptions<T, K>): Promise<void>
}
