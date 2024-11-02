// import { executeCodegen, type CodegenConfig } from '@graphql-codegen/cli'
import { type GraphQLSchema, printSchema } from 'graphql'

import { writeFile, readFile } from 'node:fs/promises'
import type {
  ClassInterface,
  EnumInterface,
  ScalarInterface,
  SchemaInterface,
} from '../schema'
import type { DevWabeTypes } from '../utils/helper'

export const generateWabeFile = ({
  scalars,
  enums,
  classes,
}: {
  enums?: EnumInterface[]
  scalars?: ScalarInterface[]
  classes: ClassInterface<DevWabeTypes>[]
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
      ? `export type WabeSchemaEnums = ${wabeEnumsGlobalTypes.join(' | ')}`
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
}: { graphqlSchemaContent: string }) => {
  // const config: CodegenConfig = {
  //   documents: [],
  //   config: {},
  //   schema: graphqlSchemaContent,
  //   generates: {
  //     'generated/wabe.ts': {
  //       // Output file for TypeScript types and operations
  //       plugins: [
  //         'typescript', // Generates TypeScript definitions for your schema
  //         'typescript-graphql-request', // Generates TypeScript types for your GraphQL operations
  //         'typescript-operations', // Generates TypeScript types for your GraphQL operations
  //       ],
  //       config: {
  //         scalars: {
  //           Date: {
  //             input: 'Date',
  //             output: 'string',
  //           },
  //           Email: {
  //             input: 'string',
  //             output: 'string',
  //           },
  //           Phone: {
  //             input: 'string',
  //             output: 'string',
  //           },
  //         },
  //       },
  //     },
  //   },
  // }

  // const output = await executeCodegen(config)

  // return output[0].content
  //
  return ''
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
  })

  const wabeOutput = generateWabeFile({
    scalars: schema.scalars,
    enums: schema.enums,
    classes: schema.classes || [],
  })

  const wabeTsContent = `${graphqlOutput}\n\n${wabeOutput}`

  try {
    const contentOfWabeFile = (await readFile(`${path}/wabe.ts`)).toString()

    // We will need to find a better way to avoid infinite loop of loading
    // Better solution will be that bun implements watch ignores
    if (!process.env.CODEGEN && contentOfWabeFile === wabeTsContent) return
  } catch {}

  await writeFile(`${path}/wabe.ts`, wabeTsContent)
  await writeFile(`${path}/schema.graphql`, graphqlSchemaContent)
}
