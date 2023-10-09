export interface AdapterOptions {
	databaseUrl: string
	databaseName: string
}

export interface DatabaseAdapter {
	connect(): Promise<any>
	createClass(className: string): Promise<any>
}
