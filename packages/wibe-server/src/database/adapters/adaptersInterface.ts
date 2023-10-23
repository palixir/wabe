import { Document, WithId } from 'mongodb'
import { NexusGenObjects } from '../../../generated/nexusTypegen'

export interface AdapterOptions {
	databaseUrl: string
	databaseName: string
}

export interface GetObjectOptions<T extends keyof NexusGenObjects> {
	className: string
	id: string
	fields: Array<keyof NexusGenObjects[T]>
}

export interface InsertObjectOptions {
	className: string
	data: Record<string, any>
}

export interface UpdateObjectOptions {
	className: string
	id: string
	data: Record<string, any>
}

// TODO : Type the return of the functions
export interface DatabaseAdapter {
	connect(): Promise<any>
	close(): Promise<any>
	createClass(className: string): Promise<any>
	getObject<T extends keyof NexusGenObjects>(
		params: GetObjectOptions<T>,
	): Promise<WithId<Document>>
	insertObject(params: InsertObjectOptions): Promise<any>
	updateObject(params: UpdateObjectOptions): Promise<any>
}
