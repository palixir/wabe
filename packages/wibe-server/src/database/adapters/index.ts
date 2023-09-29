export interface AdapterOptions {
	databaseUrl: string
	databaseName: string
}

export abstract class DatabaseAdapter {
	abstract connect(): Promise<any>
	abstract createClass(className: string): Promise<any>
}
