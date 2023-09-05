export enum DatabaseEnum {
	Mongo = 'mongo',
}

export interface DatabaseConfig {
	type: DatabaseEnum
	url: string
}
