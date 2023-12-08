export enum DatabaseEnum {
	Mongo = 'mongo',
}

export interface DatabaseConfig {
	type: DatabaseEnum
	url: string
	name: string
}

export * from './adapters'
export * from './controllers'
