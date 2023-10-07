import { objectType } from 'nexus'
import { SchemaRouterAdapter } from '.'
import { Schema } from '../Schema'
import { TypeField } from '../interface'
import { ObjectDefinitionBlock, OutputDefinitionBlock } from 'nexus/dist/blocks'

export class GraphQLSchemaAdapter extends SchemaRouterAdapter {
	private schema: Schema

	constructor(schema: Schema) {
		super()

		this.schema = schema
	}

	async createSchema() {
		if (!this.schema) throw new Error('Schema not found')

		const fields = this.schema.getFields()
		const name = this.schema.getName()

		const obj = objectType({
			name,
			definition(t) {
				Object.keys(fields).map((fieldName) => {
					const typeField = fields[fieldName]

					if (typeField.type === 'array')
						return t.list.field(fieldName, {
							type: typeField.valueType,
						})

					return t.field(fieldName, { type: typeField.type })
				})
			},
		})

		return obj
	}
}
