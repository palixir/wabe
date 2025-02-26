import { type GraphQLSchema, printSchema } from 'graphql'
import { writeFile, readFile } from 'node:fs/promises'
import type {
  ClassInterface,
  EnumInterface,
  MutationResolver,
  QueryResolver,
  ScalarInterface,
  SchemaInterface,
  TypeField,
  TypeResolver,
  WabeObject,
  WabePrimaryTypes,
} from '../schema'
import { firstLetterUpperCase, type DevWabeTypes } from '../utils/helper'
import { firstLetterInUpperCase } from '../utils'

const wabePrimaryTypesToTypescriptTypes: Record<WabePrimaryTypes, string> = {
  Boolean: 'boolean',
  Int: 'number',
  Float: 'number',
  String: 'string',
  Email: 'string',
  Phone: 'string',
  Date: 'Date',
  File: '{url: string, name: string}',
}

const wabeTypesToTypescriptTypes = ({
  field,
  isInput = false,
}: {
  field: TypeField<DevWabeTypes>
  isInput?: boolean
}) => {
  switch (field.type) {
    case 'Date':
      if (isInput) return 'Date'
      return 'string'
    case 'Boolean':
    case 'Int':
    case 'Float':
    case 'String':
    case 'Email':
    case 'Phone':
    case 'File':
      return wabePrimaryTypesToTypescriptTypes[field.type]
    case 'Array':
      if (field.typeValue === 'Object') return `Array<${field.object.name}>`
      return `Array<${wabePrimaryTypesToTypescriptTypes[field.typeValue]}>`
    case 'Pointer':
      return field.class
    case 'Relation':
      return `Array<${field.class}>`
    case 'Object':
      return `${field.object.name}`
    default:
      return field.type
  }
}

const generateWabeObject = ({
  object,
  isInput = false,
  prefix = '',
}: {
  object: WabeObject<DevWabeTypes>
  prefix?: string
  isInput?: boolean
}): Record<string, Record<string, string>> => {
  const objectName = object.name

  return Object.entries(object.fields).reduce(
    (acc, [fieldName, field]) => {
      const type = wabeTypesToTypescriptTypes({ field, isInput })

      const objectNameWithPrefix = `${prefix}${firstLetterUpperCase(objectName)}`

      if (
        field.type === 'Object' ||
        (field.type === 'Array' && field.typeValue === 'Object')
      ) {
        const subObject = generateWabeObject({
          object: field.object,
          isInput,
          prefix: objectNameWithPrefix,
        })

        const isArray = field.type === 'Array'

        return {
          ...acc,
          ...subObject,
          ...{
            [objectNameWithPrefix]: {
              ...acc[objectNameWithPrefix],
              [`${fieldName}${field.required ? '' : 'undefined'}`]: `${isArray ? 'Array<' : ''}${objectNameWithPrefix}${firstLetterUpperCase(field.object.name)}${isArray ? '>' : ''}`,
            },
          },
        }
      }

      return {
        ...acc,
        ...{
          [objectNameWithPrefix]: {
            ...acc[objectNameWithPrefix],
            [`${fieldName}${field.required ? '' : 'undefined'}`]: `${type}`,
          },
        },
      }
    },
    {} as Record<string, Record<string, string>>,
  )
}

const generateWabeTypes = (classes: ClassInterface<DevWabeTypes>[]) => {
  const wabeTypes = classes.reduce(
    (acc, classType) => {
      const { name, fields } = classType

      const objectsToLoad: Array<Record<string, Record<string, string>>> = []

      const currentClass = Object.entries(fields).reduce(
        (acc2, [name, field]) => {
          const type = wabeTypesToTypescriptTypes({ field })

          if (
            field.type === 'Object' ||
            (field.type === 'Array' && field.typeValue === 'Object')
          ) {
            const wabeObject = generateWabeObject({ object: field.object })

            objectsToLoad.push(wabeObject)
          }

          return {
            ...acc2,
            [`${name}${field.required ? '' : 'undefined'}`]: type,
          }
        },
        {} as Record<string, string>,
      )

      const objects = objectsToLoad.reduce((acc2, object) => {
        return {
          ...acc2,
          ...object,
        }
      }, {})

      return {
        ...acc,
        ...objects,
        [name]: { id: 'string', ...currentClass },
      }
    },
    {} as Record<string, Record<string, string>>,
  )

  return wabeTypes
}

const generateWabeWhereTypes = (classes: ClassInterface<DevWabeTypes>[]) => {
  const wabeTypes = classes.reduce(
    (acc, classType) => {
      const { name, fields } = classType

      const completeName = `Where${firstLetterUpperCase(name)}`

      const objectsToLoad: Array<Record<string, Record<string, string>>> = []

      const currentClass = Object.entries(fields).reduce(
        (acc2, [name, field]) => {
          const type = wabeTypesToTypescriptTypes({ field, isInput: true })

          if (
            field.type === 'Object' ||
            (field.type === 'Array' && field.typeValue === 'Object')
          ) {
            const wabeObject = generateWabeObject({
              object: field.object,
              isInput: true,
            })

            objectsToLoad.push(wabeObject)
          }

          return {
            ...acc2,
            [`${name}${field.required ? '' : 'undefined'}`]: type,
          }
        },
        {} as Record<string, string>,
      )

      const objects = objectsToLoad.reduce((acc2, object) => {
        return {
          ...acc2,
          ...object,
        }
      }, {})

      return {
        ...acc,
        ...objects,
        [completeName]: { id: 'string', ...currentClass },
      }
    },
    {} as Record<string, Record<string, string>>,
  )

  return wabeTypes
}

const generateWabeEnumTypes = (enums: EnumInterface[]) => {
  return Object.values(enums).reduce(
    (acc, { name, values }) => {
      return {
        ...acc,
        [name]: values,
      }
    },
    {} as Record<string, Record<string, string>>,
  )
}

const generateWabeScalarTypes = (scalars: ScalarInterface[]) => {
  return Object.values(scalars).reduce(
    (acc, { name }) => {
      return {
        ...acc,
        // For the moment we will just use string as the type
        // Suppose all scalars are string
        [name]: 'string',
      }
    },
    {} as Record<string, string>,
  )
}

const generateWabeMutationOrQueryInput = (
  mutationOrQueryName: string,
  resolver: MutationResolver<any> | QueryResolver<any>,
  isMutation: boolean,
) => {
  const objectsToLoad: Array<Record<string, Record<string, string>>> = []

  const mutationNameWithFirstLetterUpperCase =
    firstLetterUpperCase(mutationOrQueryName)

  const mutationObject = Object.entries(
    (isMutation ? resolver.args?.input : resolver.args) || {},
  ).reduce(
    (acc, [name, field]) => {
      let type = wabeTypesToTypescriptTypes({ field, isInput: true })

      if (field.type === 'Object') {
        type = firstLetterInUpperCase(name)

        const wabeObject = generateWabeObject({
          object: {
            ...field.object,
            name: type,
          },
          prefix: mutationNameWithFirstLetterUpperCase,
        })

        objectsToLoad.push(wabeObject)

        return {
          ...acc,
          [`${name}${field.required ? '' : 'undefined'}`]: `${mutationNameWithFirstLetterUpperCase}${type}`,
        }
      }

      return {
        ...acc,
        [`${name}${field.required ? '' : 'undefined'}`]: type,
      }
    },
    {} as Record<string, string>,
  )

  const objects = objectsToLoad.reduce((acc2, object) => {
    return {
      ...acc2,
      ...object,
    }
  }, {})

  return {
    ...(isMutation
      ? {
          [`${firstLetterInUpperCase(mutationOrQueryName)}Input`]:
            mutationObject,
        }
      : {}),
    [`${isMutation ? 'Mutation' : 'Query'}${firstLetterInUpperCase(mutationOrQueryName)}Args`]:
      isMutation
        ? {
            input: `${firstLetterInUpperCase(mutationOrQueryName)}Input`,
          }
        : mutationObject,
    ...objects,
  }
}

const generateWabeMutationsAndQueriesTypes = (resolver: TypeResolver<any>) => {
  const mutationsObject = Object.entries(resolver.mutations || {}).reduce(
    (acc, [mutationName, mutation]) => {
      return {
        ...acc,
        ...generateWabeMutationOrQueryInput(mutationName, mutation, true),
      }
    },
    {},
  )

  const queriesObject = Object.entries(resolver.queries || {}).reduce(
    (acc, [queryName, query]) => {
      return {
        ...acc,
        ...generateWabeMutationOrQueryInput(queryName, query, false),
      }
    },
    {},
  )

  return {
    ...mutationsObject,
    ...queriesObject,
  }
}

const wabeClassRecordToString = (
  wabeClass: Record<string, Record<string, string>>,
) => {
  return Object.entries(wabeClass).reduce((acc, [className, fields]) => {
    return `${acc}export type ${className} = {\n${Object.entries(fields)
      .map(
        ([fieldName, fieldType]) =>
          `\t${fieldName.replace('undefined', '?')}: ${fieldType}`,
      )
      .join(',\n')}\n}\n\n`
  }, '')
}

const wabeEnumRecordToString = (
  wabeEnum: Record<string, Record<string, string>>,
) => {
  return Object.entries(wabeEnum).reduce((acc, [enumName, values]) => {
    return `${acc}export enum ${enumName} {\n${Object.entries(values)
      .map(([valueName, value]) => `\t${valueName} = "${value}"`)
      .join(',\n')}\n}\n\n`
  }, '')
}

const wabeScalarRecordToString = (wabeScalar: Record<string, string>) => {
  return Object.entries(wabeScalar).reduce((acc, [scalarName, scalarType]) => {
    return `${acc}export type ${scalarName} = ${scalarType}\n\n`
  }, '')
}

const generateWabeDevTypes = ({
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
      : 'export type WabeSchemaScalars = ""'

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

  // Where
  const allWhereNames = classes
    .map(
      (schema) => `${schema.name}: Where${firstLetterUpperCase(schema.name)}`,
    )
    .filter((schema) => schema)

  const globalWabeWhereTypeString = `export type WabeSchemaWhereTypes = {\n\t${allWhereNames.join(
    ',\n\t',
  )}\n}`

  return `${wabeScalarType}\n\n${wabeEnumsGlobalTypesString}\n\n${globalWabeTypeString}\n\n${globalWabeWhereTypeString}`
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

  const wabeClasses = generateWabeTypes(schema.classes || [])
  const wabeWhereTypes = generateWabeWhereTypes(schema.classes || [])
  const mutationsAndQueries = generateWabeMutationsAndQueriesTypes(
    schema.resolvers || {},
  )

  const wabeEnumsInString = wabeEnumRecordToString(
    generateWabeEnumTypes(schema.enums || []),
  )
  const wabeScalarsInString = wabeScalarRecordToString(
    generateWabeScalarTypes(schema.scalars || []),
  )
  const wabeObjectsInString = wabeClassRecordToString({
    ...wabeClasses,
    ...wabeWhereTypes,
    ...mutationsAndQueries,
  })

  const wabeDevTypes = generateWabeDevTypes({
    scalars: schema.scalars,
    enums: schema.enums,
    classes: schema.classes || [],
  })

  const wabeTsContent = `${wabeEnumsInString}${wabeScalarsInString}${wabeObjectsInString}${wabeDevTypes}`

  try {
    const contentOfGraphqlSchema = (
      await readFile(`${path}/schema.graphql`)
    ).toString()

    // We will need to find a better way to avoid infinite loop of loading
    // Better solution will be that bun implements watch ignores)
    if (
      !process.env.CODEGEN &&
      contentOfGraphqlSchema === graphqlSchemaContent.toString()
    )
      return
  } catch {}

  await writeFile(`${path}/wabe.ts`, wabeTsContent)
  await writeFile(`${path}/schema.graphql`, graphqlSchemaContent)
}
