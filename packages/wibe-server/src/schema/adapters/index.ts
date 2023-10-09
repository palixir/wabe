import { NexusExtendTypeDef, NexusObjectTypeDef } from 'nexus/dist/core'

export interface SchemaRouterAdapter {
	createSchema(): (NexusObjectTypeDef<string> | NexusExtendTypeDef<any>)[]
}

export * from './GraphQLSchemaAdapter'
