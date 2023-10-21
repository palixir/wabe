import { NexusExtendTypeDef, NexusObjectTypeDef } from 'nexus/dist/core'
import { SchemaFields } from '../interface'
import { NexusGenFieldTypes } from '../../../generated/nexusTypegen'
import { DatabaseController } from '../../database/controllers/DatabaseController'

export interface SchemaRouterAdapter {
	createSchema(
		databaseController: DatabaseController,
	): (
		| NexusObjectTypeDef<keyof NexusGenFieldTypes>
		| NexusExtendTypeDef<any>
	)[]
	_getTypesFromFields(params: {
		fields: SchemaFields
		fieldsKeys: string[]
		t: any
	}): any[]
}
