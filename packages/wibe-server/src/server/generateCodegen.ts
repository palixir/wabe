import type { GraphQLSchema } from '../graphql'
import type {
	ClassInterface,
	EnumInterface,
	ScalarInterface,
	SchemaInterface,
} from '../schema'

export const generateWibeFile = ({
	scalars,
	enums,
	schemas,
}: {
	enums?: EnumInterface[]
	scalars?: ScalarInterface[]
	schemas: ClassInterface[]
}) => {
	// Scalars
	const listOfScalars = scalars?.map((scalar) => `"${scalar.name}"`) || []
	const wibeScalarType = `export type WibeSchemaScalars = ${listOfScalars.join(
		' | ',
	)}`

	// Enums
	const wibeEnumsGlobalTypes =
		enums?.map((wibeEnum) => `"${wibeEnum.name}"`) || []

	const wibeEnumsGlobalTypesString = `export type WibeSchemaEnums = ${wibeEnumsGlobalTypes.join(
		' | ',
	)}`

	// Types
	const allNames = schemas
		.map((schema) => `${schema.name}: ${schema.name}`)
		.filter((schema) => schema)

	const globalWibeTypeString = `export type WibeSchemaTypes = {\n\t${allNames.join(
		',\n\t',
	)}\n}`

	return `${wibeScalarType}\n\n${wibeEnumsGlobalTypesString}\n\n${globalWibeTypeString}`
}

export const generateCodegen = async ({
	schema,
	graphqlSchema,
	path,
}: {
	schema: SchemaInterface
	graphqlSchema: string
	path: string
}) => {
	Bun.write(
		`${path}/wibe.ts`,
		`${generateWibeFile({
			scalars: schema.scalars,
			enums: schema.enums,
			schemas: schema.class,
		})}`,
	)

	Bun.write(`${path}/schema.graphql`, graphqlSchema)
}
