import { NexusObjectTypeDef } from 'nexus/dist/core'

export interface SchemaRouterAdapter {
	createSchema(): NexusObjectTypeDef<string>[]
}

export * from './GraphQLSchemaAdapter'
