import { NexusObjectTypeDef } from 'nexus/dist/core'

export abstract class SchemaRouterAdapter {
	abstract createSchema(): NexusObjectTypeDef<string>[]
}

export * from './GraphQLSchemaAdapter'
