import { NexusExtendTypeDef, NexusObjectTypeDef } from 'nexus/dist/core'
import { SchemaFields } from '../interface'
import { NexusGenFieldTypes } from '../../../generated/nexusTypegen'
import { DatabaseController } from '../../database/controllers/DatabaseController'

export interface CreateSchemaOptions {
	databaseController: DatabaseController
}

export interface SchemaRouterAdapter {
	createSchema(): (
		| NexusObjectTypeDef<keyof NexusGenFieldTypes>
		| NexusExtendTypeDef<any>
	)[]
}
