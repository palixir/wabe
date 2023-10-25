import { Document, WithId } from 'mongodb'
import { NexusGenObjects } from '../../../generated/nexusTypegen'

export interface AdapterOptions {
	databaseUrl: string
	databaseName: string
}

export interface GetObjectOptions<T extends keyof NexusGenObjects> {
	className: string
	id: string
	fields: Array<keyof NexusGenObjects[T] | '*'>
}

export interface InsertObjectOptions<T extends keyof NexusGenObjects> {
	className: string
	data: Record<string, any>
	fields: Array<keyof NexusGenObjects[T] | '*'>
}

export interface UpdateObjectOptions<T extends keyof NexusGenObjects> {
	className: string
	id: string
	data: Record<string, any>
	fields: Array<keyof NexusGenObjects[T] | '*'>
}

// TODO : Type the return of the functions
export interface DatabaseAdapter {
	connect(): Promise<any>
	close(): Promise<any>
	createClass(className: string): Promise<any>
	getObject<T extends keyof NexusGenObjects>(
		params: GetObjectOptions<T>,
	): Promise<WithId<Document> | null>
	insertObject<T extends keyof NexusGenObjects>(
		params: InsertObjectOptions<T>,
	): Promise<any>
	updateObject<T extends keyof NexusGenObjects>(
		params: UpdateObjectOptions<T>,
	): Promise<any>
}
