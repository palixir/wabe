import { DatabaseController } from '../../database/controllers/DatabaseController'

export interface CreateSchemaOptions {
	databaseController: DatabaseController
}

export interface SchemaRouterAdapter {
	createSchema(): { object: any; queries: any; mutations: any }
}
