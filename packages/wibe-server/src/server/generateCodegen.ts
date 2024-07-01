import { codegen } from '@graphql-codegen/core'
import * as typescriptPlugin from '@graphql-codegen/typescript'
import * as graphqlRequestPlugin from '@graphql-codegen/typescript-graphql-request'
import * as graphqlOperationsPlugin from '@graphql-codegen/typescript-operations'
import { loadSchema } from '@graphql-tools/load'
import { GraphQLFileLoader } from '@graphql-tools/graphql-file-loader'
import { type GraphQLSchema, parse, printSchema } from 'graphql'
import type {
	ClassInterface,
	EnumInterface,
	ScalarInterface,
	SchemaInterface,
} from '../schema'
import type { DevWibeAppTypes } from '../utils/helper'

export const generateWibeFile = ({
	scalars,
	enums,
	classes,
}: {
	enums?: EnumInterface[]
	scalars?: ScalarInterface[]
	classes: ClassInterface<DevWibeAppTypes>[]
}) => {
	// Scalars
	const listOfScalars = scalars?.map((scalar) => `"${scalar.name}"`) || []

	const wibeScalarType =
		listOfScalars.length > 0
			? `export type WibeSchemaScalars = ${listOfScalars.join(' | ')}`
			: ''

	// Enums
	const wibeEnumsGlobalTypes =
		enums?.map((wibeEnum) => `"${wibeEnum.name}"`) || []

	const wibeEnumsGlobalTypesString =
		wibeEnumsGlobalTypes.length > 0
			? `export type WibeSchemaEnums = ${wibeEnumsGlobalTypes.join(
					' | ',
				)}`
			: ''

	// Classes
	const allNames = classes
		.map((schema) => `${schema.name}: ${schema.name}`)
		.filter((schema) => schema)

	const globalWibeTypeString = `export type WibeSchemaTypes = {\n\t${allNames.join(
		',\n\t',
	)}\n}`

	return `${wibeScalarType}\n\n${wibeEnumsGlobalTypesString}\n\n${globalWibeTypeString}`
}

export const generateGraphqlTypes = async ({
	graphqlSchema,
	path,
}: { path: string; graphqlSchema: GraphQLSchema }) => {
	const config = {
		documents: [],
		config: {},
		filename: `${path}/wibe.ts`,
		schema: parse(printSchema(graphqlSchema)),
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
}: {
	schema: SchemaInterface<any>
	path: string
}) => {
	const graphqlSchema = await loadSchema(`${path}/schema.graphql`, {
		loaders: [new GraphQLFileLoader()],
	})

	const graphqlOutput = await generateGraphqlTypes({
		graphqlSchema,
		path,
	})

	const wibeOutput = generateWibeFile({
		scalars: schema.scalars,
		enums: schema.enums,
		classes: schema.classes,
	})

	const content = `${graphqlOutput}\n\n${wibeOutput}`

	try {
		const contentOfActualWibeFile = await Bun.file(`${path}/wibe.ts`).text()

		// We will need to find a better way to avoid infinite loop of loading
		// Better solution will be that bun implements watch ignores
		if (content === contentOfActualWibeFile) return
	} catch {}

	Bun.write(`${path}/wibe.ts`, `${graphqlOutput}\n\n${wibeOutput}`)
	Bun.write(`${path}/schema.graphql`, printSchema(graphqlSchema))
}
