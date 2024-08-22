import { codegen } from '@graphql-codegen/core'
import * as typescriptPlugin from '@graphql-codegen/typescript'
import * as graphqlRequestPlugin from '@graphql-codegen/typescript-graphql-request'
import * as graphqlOperationsPlugin from '@graphql-codegen/typescript-operations'
import { type GraphQLSchema, parse, printSchema } from 'graphql'
import type {
	ClassInterface,
	EnumInterface,
	ScalarInterface,
	SchemaInterface,
} from '../schema'
import type { DevWabeAppTypes } from '../utils/helper'

export const generateWabeFile = ({
	scalars,
	enums,
	classes,
}: {
	enums?: EnumInterface[]
	scalars?: ScalarInterface[]
	classes: ClassInterface<DevWabeAppTypes>[]
}) => {
	// Scalars
	const listOfScalars = scalars?.map((scalar) => `"${scalar.name}"`) || []

	const wabeScalarType =
		listOfScalars.length > 0
			? `export type WabeSchemaScalars = ${listOfScalars.join(' | ')}`
			: ''

	// Enums
	const wabeEnumsGlobalTypes =
		enums?.map((wabeEnum) => `"${wabeEnum.name}"`) || []

	const wabeEnumsGlobalTypesString =
		wabeEnumsGlobalTypes.length > 0
			? `export type WabeSchemaEnums = ${wabeEnumsGlobalTypes.join(
					' | ',
				)}`
			: ''

	// Classes
	const allNames = classes
		.map((schema) => `${schema.name}: ${schema.name}`)
		.filter((schema) => schema)

	const globalWabeTypeString = `export type WabeSchemaTypes = {\n\t${allNames.join(
		',\n\t',
	)}\n}`

	return `${wabeScalarType}\n\n${wabeEnumsGlobalTypesString}\n\n${globalWabeTypeString}`
}

export const generateGraphqlTypes = async ({
	graphqlSchemaContent,
	path,
}: { path: string; graphqlSchemaContent: string }) => {
	const config = {
		documents: [],
		config: {},
		filename: `${path}/wabe.ts`,
		schema: parse(graphqlSchemaContent),
		plugins: [
			{ typescript: {} },
			{ 'typescript-graphql-request': {} },
			{ 'typescript-graphql-operations': {} },
		],
		pluginMap: {
			typescript: typescriptPlugin,
			'typescript-graphql-request': graphqlRequestPlugin,
			'typescript-graphql-operations': graphqlOperationsPlugin,
		},
	}

	const output = await codegen(config as any)

	return output
}

export const generateCodegen = async ({
	schema,
	path,
	graphqlSchema,
}: {
	schema: SchemaInterface<any>
	path: string
	graphqlSchema: GraphQLSchema
}) => {
	const graphqlSchemaContent = printSchema(graphqlSchema)

	const graphqlOutput = await generateGraphqlTypes({
		graphqlSchemaContent,
		path,
	})

	const wabeOutput = generateWabeFile({
		scalars: schema.scalars,
		enums: schema.enums,
		classes: schema.classes,
	})

	const content = `${graphqlOutput}\n\n${wabeOutput}`

	try {
		const contentOfActualWabeFile = await Bun.file(`${path}/wabe.ts`).text()

		// We will need to find a better way to avoid infinite loop of loading
		// Better solution will be that bun implements watch ignores
		if (content === contentOfActualWabeFile) return
	} catch {}

	Bun.write(`${path}/wabe.ts`, `${graphqlOutput}\n\n${wabeOutput}`)
	Bun.write(`${path}/schema.graphql`, graphqlSchemaContent)
}
