import { GraphQLFieldConfig, ThunkObjMap } from 'graphql'
import { DatabaseController } from '../../database/controllers/DatabaseController'

export interface CreateSchemaOptions {
	databaseController: DatabaseController
}

export interface SchemaRouterAdapter {
	createSchema(): {
		queries: ThunkObjMap<GraphQLFieldConfig<any, any, any>>
		mutations: ThunkObjMap<GraphQLFieldConfig<any, any, any>>
	}
}
