import { Document, WithId } from 'mongodb'
import { WibeTypes } from '../../../generated/wibe'
export interface WhereType {
	[key: string]: {
		equalTo?: any
		notEqualTo?: any
		greaterThan?: any
		lessThan?: any
		greaterThanOrEqualTo?: any
		lessThanOrEqualTo?: any
		in?: any[]
		notIn?: any[]
	}
}
export interface AdapterOptions {
	databaseUrl: string
	databaseName: string
}

export interface GetObjectOptions<T extends keyof WibeTypes> {
	className: string
	id: string
	fields: Array<keyof WibeTypes[T] | '*'>
}

export interface GetObjectsOptions<T extends keyof WibeTypes> {
	className: string
	where?: WhereType
	fields: Array<keyof WibeTypes[T] | '*'>
}

export interface CreateObjectOptions<T extends keyof WibeTypes> {
	className: string
	data: Record<string, any>
	fields: Array<keyof WibeTypes[T] | '*'>
}
export interface CreateObjectsOptions<T extends keyof WibeTypes> {
	className: string
	data: Array<Record<string, any>>
	fields: Array<keyof WibeTypes[T] | '*'>
}

export interface UpdateObjectOptions<T extends keyof WibeTypes> {
	className: string
	id: string
	data: Record<string, any>
	fields: Array<keyof WibeTypes[T] | '*'>
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
}
