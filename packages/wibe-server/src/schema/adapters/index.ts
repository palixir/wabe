import { NexusExtendTypeDef, NexusObjectTypeDef } from 'nexus/dist/core'
import { SchemaFields } from '../interface'
import { NexusGenFieldTypes } from '../../../generated/nexusTypegen'

export interface SchemaRouterAdapter {
	createSchema(): (
		| NexusObjectTypeDef<keyof NexusGenFieldTypes>
		| NexusExtendTypeDef<any>
	)[]
	_getTypesFromFields(options: {
		fields: SchemaFields
		fieldsKeys: string[]
		t: any
	}): any[]
}

export * from './GraphQLSchemaAdapter'
