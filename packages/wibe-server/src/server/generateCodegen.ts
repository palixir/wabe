import type {
	ClassInterface,
	EnumInterface,
	ScalarInterface,
	SchemaInterface,
} from '../schema'

export const generateWibeFile = ({
	scalars,
	enums,
	classes,
}: {
	enums?: EnumInterface[]
	scalars?: ScalarInterface[]
	classes: ClassInterface[]
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

	// Classes
	const allNames = classes
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
			classes: schema.classes,
		})}`,
	)

	Bun.write(`${path}/schema.graphql`, graphqlSchema)
}
