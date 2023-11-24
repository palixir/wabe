import { Document, WithId } from 'mongodb'
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

export interface GetObjectOptions<T extends any> {
	className: string
	id: string
	fields: Array<any | '*'>
}

export interface GetObjectsOptions<T extends any> {
	className: string
	where?: WhereType
	fields: Array<any | '*'>
}

export interface CreateObjectOptions<T extends any> {
	className: string
	data: Record<string, any>
	fields: Array<any | '*'>
}
export interface CreateObjectsOptions<T extends any> {
	className: string
	data: Array<Record<string, any>>
	fields: Array<any | '*'>
}

export interface UpdateObjectOptions<T extends any> {
	className: string
	id: string
	data: Record<string, any>
	fields: Array<any | '*'>
}

// TODO : Type the return of the functions
export interface DatabaseAdapter {
	connect(): Promise<any>
	close(): Promise<any>

	createClass(className: string): Promise<any>

	getObject<T extends any>(
		params: GetObjectOptions<T>,
	): Promise<WithId<Document> | null>
	getObjects<T extends any>(
		params: GetObjectsOptions<T>,
	): Promise<WithId<any>[]>

	createObject<T extends any>(params: CreateObjectOptions<T>): Promise<any>
	createObjects<T extends any>(params: CreateObjectsOptions<T>): Promise<any>

	updateObject<T extends any>(params: UpdateObjectOptions<T>): Promise<any>
}
