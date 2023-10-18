import { Document, WithId } from 'mongodb'

export interface AdapterOptions {
	databaseUrl: string
	databaseName: string
}

// TODO : Type the return of the functions
export interface DatabaseAdapter {
	connect(): Promise<any>
	createClass(className: string): Promise<any>
	getObject(params: {
		className: string
		id: string
		fields: Record<string, any>
	}): Promise<WithId<Document>>
	insertObject(params: {
		className: string
		data: Record<string, any>
	}): Promise<any>
	updateObject(params: {
		className: string
		id: string
		data: Record<string, any>
	}): Promise<any>
}
