export interface AdapterOptions {
	databaseUrl: string
	databaseName: string
}

export interface DatabaseAdapter {
	connect(): Promise<any>
	createClass(className: string): Promise<any>
	getObject(params: {
		className: string
		id: string
		fields: Record<string, any>
	}): Promise<any>
	insertObject(params: {
		className: string
		data: Record<string, any>
	}): Promise<any>
}
