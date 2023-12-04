import { Document, WithId } from 'mongodb'
import { WibeTypes } from '../../../generated/wibe'

type WhereAggregation<T extends keyof WibeTypes> = {
	[key in keyof WibeTypes[T]]: {
		equalTo?: any
		notEqualTo?: any
		greaterThan?: any
		lessThan?: any
		greaterThanOrEqualTo?: any
		lessThanOrEqualTo?: any
		in?: any[]
		notIn?: any[]
	} & WhereConditional<T>
}

type WhereConditional<T extends keyof WibeTypes> = {
	OR?: WhereType<T>
	AND?: WhereType<T>
}

export type WhereType<T extends keyof WibeTypes> = Partial<
	WhereAggregation<T>
> &
	WhereConditional<T>
export interface AdapterOptions {
	databaseUrl: string
	databaseName: string
}

export interface GetObjectOptions<T extends keyof WibeTypes> {
	className: string
	id: string
	fields: Array<keyof WibeTypes[T] | '*' | 'id'>
}

export interface GetObjectsOptions<T extends keyof WibeTypes> {
	className: string
	where?: WhereType<T>
	fields: Array<keyof WibeTypes[T] | '*' | 'id'>
}

export interface CreateObjectOptions<T extends keyof WibeTypes> {
	className: string
	data: Record<string, any>
	fields: Array<keyof WibeTypes[T] | '*' | 'id'>
}
export interface CreateObjectsOptions<T extends keyof WibeTypes> {
	className: string
	data: Array<Record<string, any>>
	fields: Array<keyof WibeTypes[T] | '*' | 'id'>
}

export interface UpdateObjectOptions<T extends keyof WibeTypes> {
	className: string
	id: string
	data: Record<string, any>
	fields: Array<keyof WibeTypes[T] | '*' | 'id'>
}

export interface UpdateObjectsOptions<T extends keyof WibeTypes> {
	className: string
	where: WhereType<T>
	data: Record<string, any>
	fields: Array<keyof WibeTypes[T] | '*' | 'id'>
}

export interface DeleteObjectOptions<T extends keyof WibeTypes> {
	className: string
	id: string
	fields: Array<keyof WibeTypes[T] | '*' | 'id'>
}

export interface DeleteObjectsOptions<T extends keyof WibeTypes> {
	className: string
	where: WhereType<T>
	fields: Array<keyof WibeTypes[T] | '*' | 'id'>
}

// TODO : Type the return of the functions
export interface DatabaseAdapter {
	connect(): Promise<any>
	close(): Promise<any>

	createClass(className: string): Promise<any>

	getObject<T extends keyof WibeTypes>(
		params: GetObjectOptions<T>,
	): Promise<WithId<Document> | null>
	getObjects<T extends keyof WibeTypes>(
		params: GetObjectsOptions<T>,
	): Promise<WithId<any>[]>

	createObject<T extends keyof WibeTypes>(
		params: CreateObjectOptions<T>,
	): Promise<any>
	createObjects<T extends keyof WibeTypes>(
		params: CreateObjectsOptions<T>,
	): Promise<any>

	updateObject<T extends keyof WibeTypes>(
		params: UpdateObjectOptions<T>,
	): Promise<any>
	updateObjects<T extends keyof WibeTypes>(
		params: UpdateObjectsOptions<T>,
	): Promise<any>

	deleteObject<T extends keyof WibeTypes>(
		params: DeleteObjectOptions<T>,
	): Promise<any>
	deleteObjects<T extends keyof WibeTypes>(
		params: DeleteObjectsOptions<T>,
	): Promise<any>
}
