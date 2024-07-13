import type { WibeContext } from '../../server/interface'
import type { WibeAppTypes } from '../../server'

type WhereAggregation<
	T extends keyof WibeAppTypes['types'],
	K extends keyof WibeAppTypes['types'][T],
> = Record<
	K | 'id',
	{
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
>

type WhereConditional<
	T extends keyof WibeAppTypes['types'],
	K extends keyof WibeAppTypes['types'][T],
> = {
	OR?: Array<WhereType<T, K>>
	AND?: Array<WhereType<T, K>>
}

export type WhereType<
	T extends keyof WibeAppTypes['types'],
	K extends keyof WibeAppTypes['types'][T],
> = Partial<WhereAggregation<T, K>> & WhereConditional<T, K>

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
	where?: WhereType<T, K>
	fields?: Array<K | '*'>
	context: WibeContext<any>
	skipHooks?: boolean
}

export interface GetObjectsOptions<
	T extends keyof WibeAppTypes['types'],
	K extends keyof WibeAppTypes['types'][T],
> {
	className: T
	where?: WhereType<T, K>
	fields?: Array<K | '*'>
	offset?: number
	limit?: number
	context: WibeContext<any>
	skipHooks?: boolean
}

export interface CreateObjectOptions<
	T extends keyof WibeAppTypes['types'],
	K extends keyof WibeAppTypes['types'][T],
	W extends keyof WibeAppTypes['types'][T],
> {
	className: T
	data: Record<W, any>
	fields?: Array<K | '*'>
	context: WibeContext<any>
}
export interface CreateObjectsOptions<
	T extends keyof WibeAppTypes['types'],
	K extends keyof WibeAppTypes['types'][T],
	W extends keyof WibeAppTypes['types'][T],
> {
	className: T
	data: Array<Record<W, any>>
	fields?: Array<K | '*'>
	offset?: number
	limit?: number
	context: WibeContext<any>
}

export interface UpdateObjectOptions<
	T extends keyof WibeAppTypes['types'],
	K extends keyof WibeAppTypes['types'][T],
	W extends keyof WibeAppTypes['types'][T],
> {
	className: T
	id: string
	where?: WhereType<T, K>
	data: Partial<Record<W, any>>
	fields?: Array<K | '*'>
	context: WibeContext<any>
}

export interface UpdateObjectsOptions<
	T extends keyof WibeAppTypes['types'],
	K extends keyof WibeAppTypes['types'][T],
	W extends keyof WibeAppTypes['types'][T],
> {
	className: T
	where: WhereType<T, W>
	data: Partial<Record<W, any>>
	fields?: Array<K | '*'>
	offset?: number
	limit?: number
	context: WibeContext<any>
}

export interface DeleteObjectOptions<
	T extends keyof WibeAppTypes['types'],
	K extends keyof WibeAppTypes['types'][T],
> {
	className: T
	id: string
	where?: WhereType<T, K>
	fields?: Array<K | '*'>
	context: WibeContext<any>
}

export interface DeleteObjectsOptions<
	T extends keyof WibeAppTypes['types'],
	K extends keyof WibeAppTypes['types'][T],
> {
	className: T
	where: WhereType<T, K>
	fields?: Array<K | '*'>
	offset?: number
	limit?: number
	context: WibeContext<any>
}

export type OutputType<
	T extends keyof WibeAppTypes['types'],
	K extends keyof WibeAppTypes['types'][T],
> = Pick<WibeAppTypes['types'][T], K> & { id: string }

export interface DatabaseAdapter {
	connect(): Promise<any>
	close(): Promise<any>

	createClassIfNotExist(className: string): Promise<any>

	getObject<
		T extends keyof WibeAppTypes['types'],
		K extends keyof WibeAppTypes['types'][T],
	>(params: GetObjectOptions<T, K>): Promise<OutputType<T, K>>
	getObjects<
		T extends keyof WibeAppTypes['types'],
		K extends keyof WibeAppTypes['types'][T],
	>(params: GetObjectsOptions<T, K>): Promise<OutputType<T, K>[]>

	createObject<
		T extends keyof WibeAppTypes['types'],
		K extends keyof WibeAppTypes['types'][T],
		W extends keyof WibeAppTypes['types'][T],
	>(params: CreateObjectOptions<T, K, W>): Promise<OutputType<T, K>>
	createObjects<
		T extends keyof WibeAppTypes['types'],
		K extends keyof WibeAppTypes['types'][T],
		W extends keyof WibeAppTypes['types'][T],
	>(params: CreateObjectsOptions<T, K, W>): Promise<OutputType<T, K>[]>

	updateObject<
		T extends keyof WibeAppTypes['types'],
		K extends keyof WibeAppTypes['types'][T],
		W extends keyof WibeAppTypes['types'][T],
	>(params: UpdateObjectOptions<T, K, W>): Promise<OutputType<T, K>>
	updateObjects<
		T extends keyof WibeAppTypes['types'],
		K extends keyof WibeAppTypes['types'][T],
		W extends keyof WibeAppTypes['types'][T],
	>(params: UpdateObjectsOptions<T, K, W>): Promise<OutputType<T, K>[]>

	deleteObject<
		T extends keyof WibeAppTypes['types'],
		K extends keyof WibeAppTypes['types'][T],
	>(params: DeleteObjectOptions<T, K>): Promise<void>
	deleteObjects<
		T extends keyof WibeAppTypes['types'],
		K extends keyof WibeAppTypes['types'][T],
	>(params: DeleteObjectsOptions<T, K>): Promise<void>
}
