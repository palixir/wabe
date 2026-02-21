import { type GraphQLSchema, parse, print, printSchema } from 'graphql'
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
	Hash: 'string',
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
		case 'Hash':
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

			if (field.type === 'Object' || (field.type === 'Array' && field.typeValue === 'Object')) {
				const subObject = generateWabeObject({
					object: field.object,
					isInput,
					prefix: objectNameWithPrefix,
				})

				const isArray = field.type === 'Array'

				return {
					...acc,
					...subObject,
					[objectNameWithPrefix]: {
						...acc[objectNameWithPrefix],
						[`${fieldName}${field.required ? '' : 'undefined'}`]: `${
							isArray ? 'Array<' : ''
						}${objectNameWithPrefix}${firstLetterUpperCase(field.object.name)}${
							isArray ? '>' : ''
						}`,
					},
				}
			}

			return {
				...acc,
				[objectNameWithPrefix]: {
					...acc[objectNameWithPrefix],
					[`${fieldName}${field.required ? '' : 'undefined'}`]: `${type}`,
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

					if (field.type === 'Object' || (field.type === 'Array' && field.typeValue === 'Object')) {
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

					if (field.type === 'Object' || (field.type === 'Array' && field.typeValue === 'Object')) {
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

	const mutationNameWithFirstLetterUpperCase = firstLetterUpperCase(mutationOrQueryName)

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
					[`${firstLetterInUpperCase(mutationOrQueryName)}Input`]: mutationObject,
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

	const queriesObject = Object.entries(resolver.queries || {}).reduce((acc, [queryName, query]) => {
		return {
			...acc,
			...generateWabeMutationOrQueryInput(queryName, query, false),
		}
	}, {})

	return {
		...mutationsObject,
		...queriesObject,
	}
}

export type CodegenFormatOptions = {
	indent?: string
	comma?: boolean
	semi?: boolean
	quote?: 'single' | 'double'
	formatCommand?: string
	graphqlPrintWidth?: number
	graphqlFinalNewline?: boolean
	graphqlSemanticCompare?: boolean
}

const normalizeGraphqlSchemaForComparison = (schemaContent: string) => {
	try {
		return print(parse(schemaContent))
	} catch {
		return schemaContent
	}
}

const wrapLongGraphqlFieldArguments = ({
	content,
	indent,
	printWidth,
}: {
	content: string
	indent: string
	printWidth: number
}) => {
	return content
		.split('\n')
		.map((line) => {
			if (line.length <= printWidth) return line

			const fieldWithArgsMatch = line.match(/^(\s*)([_A-Za-z][_0-9A-Za-z]*)\((.+)\):\s*(.+)$/)
			if (!fieldWithArgsMatch) return line

			const [, fieldIndent = '', fieldName = '', argsString = '', returnType = ''] =
				fieldWithArgsMatch
			if (!fieldName || !argsString || !returnType) return line
			const args = argsString
				.split(',')
				.map((arg) => arg.trim())
				.filter((arg) => arg.length > 0)

			if (args.length <= 1) return line

			return `${fieldIndent}${fieldName}(\n${args
				.map((arg) => `${fieldIndent}${indent}${arg}`)
				.join('\n')}\n${fieldIndent}): ${returnType}`
		})
		.join('\n')
}

const wabeClassRecordToString = (
	wabeClass: Record<string, Record<string, string>>,
	options?: CodegenFormatOptions,
) => {
	const indent = options?.indent ?? '\t'
	const endChar = options?.semi ? ';' : options?.comma ? ',' : ''
	const lastEndChar = options?.semi
		? ';'
		: options?.comma === true
			? ','
			: options?.comma === false
				? ''
				: ''

	return Object.entries(wabeClass).reduce((acc, [className, fields]) => {
		const fieldsLength = Object.keys(fields).length
		if (fieldsLength === 0) return `${acc}export type ${className} = {}\n\n`

		return `${acc}export type ${className} = {\n${Object.entries(fields)
			.map(
				([fieldName, fieldType]) => `${indent}${fieldName.replace('undefined', '?')}: ${fieldType}`,
			)
			.join(`${endChar}\n`)}${fieldsLength > 0 ? lastEndChar : ''}\n}\n\n`
	}, '')
}

const wabeEnumRecordToString = (
	wabeEnum: Record<string, Record<string, string>>,
	options?: CodegenFormatOptions,
) => {
	const indent = options?.indent ?? '\t'
	const endChar = options?.semi ? ';' : (options?.comma ?? true) ? ',' : ''
	const quoteString = options?.quote === 'double' ? '"' : "'"

	return Object.entries(wabeEnum).reduce((acc, [enumName, values]) => {
		const valuesLength = Object.keys(values).length
		return `${acc}export enum ${enumName} {\n${Object.entries(values)
			.map(([valueName, value]) => `${indent}${valueName} = ${quoteString}${value}${quoteString}`)
			.join(`${endChar}\n`)}${valuesLength > 0 ? endChar : ''}\n}\n\n`
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
	options,
}: {
	enums?: EnumInterface[]
	scalars?: ScalarInterface[]
	classes: ClassInterface<DevWabeTypes>[]
	options?: CodegenFormatOptions
}) => {
	const indent = options?.indent ?? '\t'
	const endChar = options?.semi ? ';' : options?.comma ? ',' : ''
	const quoteString = options?.quote === 'double' ? '"' : "'"

	// Scalars
	const listOfScalars = scalars?.map((scalar) => `${quoteString}${scalar.name}${quoteString}`) || []

	const wabeScalarType =
		listOfScalars.length > 0
			? `export type WabeSchemaScalars = ${listOfScalars.join(' | ')}`
			: `export type WabeSchemaScalars = ${quoteString}${quoteString}`

	// Enums
	const wabeEnumsGlobalTypes = enums?.map((wabeEnum) => `${wabeEnum.name}: ${wabeEnum.name}`) || []

	const wabeEnumsGlobalTypesString =
		wabeEnumsGlobalTypes.length > 0
			? `export type WabeSchemaEnums = {\n${indent}${wabeEnumsGlobalTypes.join(`${endChar}\n${indent}`)}${endChar}\n}`
			: ''

	// Classes
	const allNames = classes
		.map((schema) => `${schema.name}: ${schema.name}`)
		.filter((schema) => schema)

	const globalWabeTypeString =
		allNames.length > 0
			? `export type WabeSchemaTypes = {\n${indent}${allNames.join(`${endChar}\n${indent}`)}${endChar}\n}`
			: ''

	// Where
	const allWhereNames = classes
		.map((schema) => `${schema.name}: Where${firstLetterUpperCase(schema.name)}`)
		.filter((schema) => schema)

	const globalWabeWhereTypeString =
		allWhereNames.length > 0
			? `export type WabeSchemaWhereTypes = {\n${indent}${allWhereNames.join(
					`${endChar}\n${indent}`,
				)}${endChar}\n}`
			: ''

	return `${wabeScalarType}\n\n${wabeEnumsGlobalTypesString}\n\n${globalWabeTypeString}\n\n${globalWabeWhereTypeString}`
}

export const generateCodegen = async ({
	schema,
	path,
	graphqlSchema,
	options,
}: {
	schema: SchemaInterface<any>
	path: string
	graphqlSchema: GraphQLSchema
	options?: CodegenFormatOptions
}) => {
	let graphqlSchemaContent = printSchema(graphqlSchema)

	const indentStr = options?.indent ?? '\t'
	const graphqlPrintWidth = options?.graphqlPrintWidth ?? 100
	const shouldEnsureFinalNewline = options?.graphqlFinalNewline ?? true
	const shouldUseSemanticComparison = options?.graphqlSemanticCompare ?? true

	if (indentStr !== '  ') {
		graphqlSchemaContent = graphqlSchemaContent.replaceAll('  ', indentStr)
	}

	graphqlSchemaContent = graphqlSchemaContent.replace(/"""([^\n"]+)"""/g, '"""\n$1\n"""')

	graphqlSchemaContent = wrapLongGraphqlFieldArguments({
		content: graphqlSchemaContent,
		indent: indentStr,
		printWidth: graphqlPrintWidth,
	})

	if (shouldEnsureFinalNewline && !graphqlSchemaContent.endsWith('\n')) {
		graphqlSchemaContent += '\n'
	}

	const wabeClasses = generateWabeTypes(schema.classes || [])
	const wabeWhereTypes = generateWabeWhereTypes(schema.classes || [])
	const mutationsAndQueries = generateWabeMutationsAndQueriesTypes(schema.resolvers || {})

	const wabeEnumsInString = wabeEnumRecordToString(
		generateWabeEnumTypes(schema.enums || []),
		options,
	)
	const wabeScalarsInString = wabeScalarRecordToString(
		generateWabeScalarTypes(schema.scalars || []),
	)
	const wabeObjectsInString = wabeClassRecordToString(
		{
			...wabeClasses,
			...wabeWhereTypes,
			...mutationsAndQueries,
		},
		options,
	)

	const wabeDevTypes = generateWabeDevTypes({
		scalars: schema.scalars,
		enums: schema.enums,
		classes: schema.classes || [],
		options,
	})

	const wabeTsContent = `${wabeEnumsInString}${wabeScalarsInString}${wabeObjectsInString}${wabeDevTypes}\n`

	let shouldWriteGraphqlSchema = true
	try {
		const contentOfGraphqlSchema = (await readFile(`${path}/schema.graphql`)).toString()
		const strictComparisonIsEqual = contentOfGraphqlSchema === graphqlSchemaContent
		const semanticComparisonIsEqual =
			shouldUseSemanticComparison &&
			normalizeGraphqlSchemaForComparison(contentOfGraphqlSchema) ===
				normalizeGraphqlSchemaForComparison(graphqlSchemaContent)

		// Avoid formatting-only writes and file-watch loops.
		shouldWriteGraphqlSchema = !(strictComparisonIsEqual || semanticComparisonIsEqual)
	} catch {}

	await writeFile(`${path}/wabe.ts`, wabeTsContent)
	if (shouldWriteGraphqlSchema) {
		await writeFile(`${path}/schema.graphql`, graphqlSchemaContent)
	}

	if (options?.formatCommand) {
		const { exec } = await import('node:child_process')
		const { promisify } = await import('node:util')
		try {
			await promisify(exec)(options.formatCommand)
		} catch (e) {
			console.error('Error running formatCommand on codegen files:', e)
		}
	}
}
