import { Document, WithId } from 'mongodb'
import { NexusGenObjects } from '../../../generated/nexusTypegen'

export interface AdapterOptions {
	databaseUrl: string
	databaseName: string
}

export interface GetObjectsOptions<T extends keyof NexusGenObjects> {
	className: string
	fields: Array<keyof NexusGenObjects[T] | '*'>
}

export interface GetObjectOptions<T extends keyof NexusGenObjects> {
	className: string
	id: string
	fields: Array<keyof NexusGenObjects[T] | '*'>
}

export interface CreateObjectOptions<T extends keyof NexusGenObjects> {
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
	getObjects<T extends keyof NexusGenObjects>(
		params: GetObjectsOptions<T>,
	): Promise<WithId<NexusGenObjects[T]>[]>
	createObject<T extends keyof NexusGenObjects>(
		params: CreateObjectOptions<T>,
	): Promise<any>
	updateObject<T extends keyof NexusGenObjects>(
		params: UpdateObjectOptions<T>,
	): Promise<any>
}
