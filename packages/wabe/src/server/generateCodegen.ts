import {
  type DocumentNode,
  type EnumTypeDefinitionNode,
  type GraphQLSchema,
  type InputObjectTypeDefinitionNode,
  type NamedTypeNode,
  type ObjectTypeDefinitionNode,
  parse,
  printSchema,
  type ScalarTypeDefinitionNode,
  visit,
} from 'graphql'

import { writeFile, readFile } from 'node:fs/promises'
import type {
  ClassInterface,
  EnumInterface,
  ScalarInterface,
  SchemaInterface,
} from '../schema'
import { firstLetterUpperCase, type DevWabeTypes } from '../utils/helper'

const defaultScalars: Record<string, { input: string; output: string }> = {
  ID: { input: 'string', output: 'string' },
  String: { input: 'string', output: 'string' },
  Boolean: { input: 'boolean', output: 'boolean' },
  Int: { input: 'number', output: 'number' },
  Float: { input: 'number', output: 'number' },
  Email: { input: 'string', output: 'string' },
  Phone: { input: 'string', output: 'string' },
  Date: { input: 'Date', output: 'string' },
  Search: { input: 'any', output: 'any' },
  Any: { input: 'any', output: 'any' },
  File: { input: 'any', output: 'any' },
}

const getScalarsCode = () =>
  Object.keys(defaultScalars).reduce((acc, scalarName) => {
    const scalarDef = defaultScalars[scalarName]

    return `${acc}  ${scalarName}: { input: ${scalarDef.input}; output: ${scalarDef.output}; };\n`
  }, 'export type Scalars = {\n')

// Set to store all custom scalar names
const customScalars = new Set<string>()

const generateTypescriptFromSchema = (schema: string): string => {
  const documentNode: DocumentNode = parse(schema)

  // Generate the Scalars type with input/output structure
  const scalarsCode = getScalarsCode()

  let typescriptCode = scalarsCode + '};\n\n'

  // Visit each definition in the schema
  visit(documentNode, {
    ScalarTypeDefinition(node: ScalarTypeDefinitionNode) {
      const typeName = node.name.value
      if (!defaultScalars[typeName]) {
        typescriptCode += `type ${typeName} = Scalars['${typeName}']; // Custom Scalar\n`
      }
    },

    ObjectTypeDefinition(node: ObjectTypeDefinitionNode) {
      const typeName = node.name.value
      let fieldsCode = ''

      for (const field of node.fields || []) {
        const fieldName = field.name.value
        const fieldType = getFieldType(field.type, false) // Pass false to use output in ObjectType
        const isOptional = field.type.kind !== 'NonNullType'
        fieldsCode += `  ${fieldName}${isOptional ? '?' : ''}: ${fieldType};\n`
      }

      typescriptCode += `\nexport type ${typeName} = {\n${fieldsCode}};\n`

      // Generate argument types for Mutation fields
      if (typeName === 'Mutation' || typeName === 'Query') {
        for (const field of node.fields || []) {
          const fieldName = field.name.value
          const args = field.arguments || []

          // If the query or mutation takes a single input argument, generate an Args type
          if (args.length === 1 && args[0].name.value === 'input') {
            const inputType = getFieldType(args[0].type, true) // Use input subtype for args
            typescriptCode += `\nexport type ${firstLetterUpperCase(
              typeName,
            )}${firstLetterUpperCase(fieldName)}Args = {\n  input: ${inputType};\n};\n`
          }
          // If there are multiple arguments, list them explicitly
          else if (args.length > 0) {
            const argsCode = args.reduce(
              (acc, arg) => {
                const argName = arg.name.value
                const argType = getFieldType(arg.type, true) // Use input subtype for args
                const isOptional = arg.type.kind !== 'NonNullType'
                return `${acc}  ${argName}${isOptional ? '?' : ''}: ${argType};\n`
              },
              `\nexport type ${firstLetterUpperCase(
                typeName,
              )}${firstLetterUpperCase(fieldName)}Args = {\n`,
            )

            typescriptCode += `${argsCode}};\n`
          }
        }
      }
    },

    // Input Object Type
    InputObjectTypeDefinition(node: InputObjectTypeDefinitionNode) {
      const inputTypeName = node.name.value
      let inputFieldsCode = ''

      for (const field of node.fields || []) {
        const fieldName = field.name.value
        const fieldType = getFieldType(field.type, true) // Pass true to use input in InputType
        const isOptional = field.type.kind !== 'NonNullType'
        inputFieldsCode += `  ${fieldName}${isOptional ? '?' : ''}: ${fieldType};\n`
      }

      typescriptCode += `\nexport type ${inputTypeName} = {\n${inputFieldsCode}};\n`
    },

    // Enum Type - Generate TypeScript enums instead of union types
    EnumTypeDefinition(node: EnumTypeDefinitionNode) {
      const enumName = node.name.value
      const values =
        node.values
          ?.map((value) => `  ${value.name.value} = "${value.name.value}",`)
          .join('\n') || ''

      typescriptCode += `\nexport enum ${enumName} {\n${values}\n}\n`
    },
  })

  return typescriptCode
}

// Helper function to get the TypeScript type from GraphQL field type
const getFieldType = (typeNode: any, isInputField = false): string => {
  // Check if the field type is a named type and if it corresponds to a scalar
  const getNamedType = (node: NamedTypeNode): string => {
    const typeName = node.name.value
    if (defaultScalars[typeName])
      return `Scalars['${typeName}']['${isInputField ? 'input' : 'output'}']`

    if (customScalars.has(typeName))
      return `Scalars['${typeName}']['${isInputField ? 'input' : 'output'}']`

    return typeName
  }

  switch (typeNode.kind) {
    case 'NamedType':
      return getNamedType(typeNode)
    case 'NonNullType':
      return getFieldType(typeNode.type, isInputField)
    case 'ListType':
      return `${getFieldType(typeNode.type, isInputField)}[]`
    default:
      return 'any'
  }
}

export const generateAdditionalTypes = ({
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
    enums?.map((wabeEnum) => `${wabeEnum.name}: ${wabeEnum.name}`) || []

  const wabeEnumsGlobalTypesString =
    wabeEnumsGlobalTypes.length > 0
      ? `export type WabeSchemaEnums = {\n\t${wabeEnumsGlobalTypes.join(',\n\t')}\n}`
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

  const typescriptCode = generateTypescriptFromSchema(graphqlSchemaContent)

  const wabeOutput = generateAdditionalTypes({
    scalars: schema.scalars,
    enums: schema.enums,
    classes: schema.classes || [],
  })

  const wabeTsContent = `${typescriptCode}\n\n${wabeOutput}`

  try {
    const contentOfWabeFile = (await readFile(`${path}/wabe.ts`)).toString()

    // We will need to find a better way to avoid infinite loop of loading
    // Better solution will be that bun implements watch ignores
    if (!process.env.CODEGEN && contentOfWabeFile === wabeTsContent) return
  } catch {}

  await writeFile(`${path}/wabe.ts`, wabeTsContent)
  await writeFile(`${path}/schema.graphql`, graphqlSchemaContent)
}
