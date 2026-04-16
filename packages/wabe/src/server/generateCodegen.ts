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

export type CodegenFormatOptions = {
	indent?: string
	comma?: boolean
	semi?: boolean
	quote?: 'single' | 'double'
	formatCommand?: string
	printWidth?: number
	finalNewline?: boolean
	semanticCompare?: boolean
}

const wabePrimaryTypesToTypescriptTypes: Record<Exclude<WabePrimaryTypes, 'File'>, string> = {
	Boolean: 'boolean',
	Int: 'number',
	Float: 'number',
	String: 'string',
	Any: 'any',
	Email: 'string',
	Phone: 'string',
	Date: 'Date',
	Hash: 'string',
}

export const getIndent = (options?: CodegenFormatOptions): string => options?.indent ?? '\t'

export const getEndChar = (options?: CodegenFormatOptions): string =>
	options?.semi ? ';' : options?.comma ? ',' : ''

export const getQuoteChar = (options?: CodegenFormatOptions): string =>
	options?.quote === 'double' ? '"' : "'"

export const getFileOutputTypeString = (options?: CodegenFormatOptions) => {
	const sep = options?.semi ? '; ' : ', '
	return `{ name: string${sep}url?: string${sep}urlGeneratedAt?: string${sep}isPresignedUrl: boolean }`
}

export const getFileInputTypeString = (options?: CodegenFormatOptions) => {
	const sep = options?.semi ? '; ' : ', '
	return `{ file: File${sep}url?: never${sep}name?: never } | { file?: never${sep}url: string${sep}name: string }`
}

export const getFileTypeString = (options?: CodegenFormatOptions, isInput = false) =>
	isInput ? getFileInputTypeString(options) : getFileOutputTypeString(options)

export const wabeTypesToTypescriptTypes = ({
	field,
	isInput = false,
	formatOptions,
}: {
	field: TypeField<DevWabeTypes>
	isInput?: boolean
	formatOptions?: CodegenFormatOptions
}) => {
	switch (field.type) {
		case 'Date':
			return isInput ? 'Date' : 'string'
		case 'File':
			return getFileTypeString(formatOptions, isInput)
		case 'Boolean':
		case 'Int':
		case 'Float':
		case 'String':
		case 'Any':
		case 'Email':
		case 'Phone':
		case 'Hash':
			return wabePrimaryTypesToTypescriptTypes[field.type]
		case 'Array':
			if (field.typeValue === 'Object') return `Array<${field.object.name}>`
			if (field.typeValue === 'File') return `Array<${getFileTypeString(formatOptions, isInput)}>`
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

const fieldKey = (name: string, required?: boolean) => `${name}${required ? '' : 'undefined'}`

const generateWabeObject = ({
	object,
	isInput = false,
	prefix = '',
	formatOptions,
}: {
	object: WabeObject<DevWabeTypes>
	prefix?: string
	isInput?: boolean
	formatOptions?: CodegenFormatOptions
}): Record<string, Record<string, string>> => {
	const objectNameWithPrefix = `${prefix}${firstLetterUpperCase(object.name)}`

	return Object.entries(object.fields).reduce(
		(acc, [fieldName, field]) => {
			const type = wabeTypesToTypescriptTypes({ field, isInput, formatOptions })

			if (field.type === 'Object' || (field.type === 'Array' && field.typeValue === 'Object')) {
				const subObject = generateWabeObject({
					object: field.object,
					isInput,
					prefix: objectNameWithPrefix,
					formatOptions,
				})

				const isArray = field.type === 'Array'
				const subTypeName = `${objectNameWithPrefix}${firstLetterUpperCase(field.object.name)}`

				return {
					...acc,
					...subObject,
					[objectNameWithPrefix]: {
						...acc[objectNameWithPrefix],
						[fieldKey(fieldName, field.required)]: isArray ? `Array<${subTypeName}>` : subTypeName,
					},
				}
			}

			return {
				...acc,
				[objectNameWithPrefix]: {
					...acc[objectNameWithPrefix],
					[fieldKey(fieldName, field.required)]: `${type}`,
				},
			}
		},
		{} as Record<string, Record<string, string>>,
	)
}

const mergeNestedStringRecords = (records: Array<Record<string, Record<string, string>>>) =>
	Object.assign({} as Record<string, Record<string, string>>, ...records)

const generateClassTypes = (
	classes: ClassInterface<DevWabeTypes>[],
	formatOptions?: CodegenFormatOptions,
	namePrefix = '',
	isInput = false,
) =>
	classes.reduce(
		(acc, { name, fields }) => {
			const objectsToLoad: Array<Record<string, Record<string, string>>> = []

			const currentClass = Object.entries(fields).reduce(
				(acc2, [fieldName, field]) => {
					const type = wabeTypesToTypescriptTypes({ field, isInput, formatOptions })

					if (field.type === 'Object' || (field.type === 'Array' && field.typeValue === 'Object')) {
						objectsToLoad.push(generateWabeObject({ object: field.object, isInput, formatOptions }))
					}

					return {
						...acc2,
						[fieldKey(fieldName, field.required)]: type,
					}
				},
				{} as Record<string, string>,
			)

			const completeName = namePrefix ? `${namePrefix}${firstLetterUpperCase(name)}` : name

			return {
				...acc,
				...mergeNestedStringRecords(objectsToLoad),
				[completeName]: { id: 'string', ...currentClass },
			}
		},
		{} as Record<string, Record<string, string>>,
	)

const generateWabeEnumTypes = (enums: EnumInterface[]) =>
	enums.reduce(
		(acc, { name, values }) => ({ ...acc, [name]: values }),
		{} as Record<string, Record<string, string>>,
	)

const generateWabeScalarTypes = (scalars: ScalarInterface[]) =>
	scalars.reduce((acc, { name }) => ({ ...acc, [name]: 'string' }), {} as Record<string, string>)

const generateWabeMutationOrQueryInput = (
	mutationOrQueryName: string,
	resolver: MutationResolver<any> | QueryResolver<any>,
	isMutation: boolean,
	formatOptions?: CodegenFormatOptions,
) => {
	const objectsToLoad: Array<Record<string, Record<string, string>>> = []
	const upperName = firstLetterUpperCase(mutationOrQueryName)

	const resolvedArgs = Object.entries(
		(isMutation ? resolver.args?.input : resolver.args) || {},
	).reduce(
		(acc, [name, field]) => {
			if (field.type === 'Object') {
				const typeName = firstLetterInUpperCase(name)
				objectsToLoad.push(
					generateWabeObject({
						object: { ...field.object, name: typeName },
						prefix: upperName,
						formatOptions,
					}),
				)
				return {
					...acc,
					[fieldKey(name, field.required)]: `${upperName}${typeName}`,
				}
			}

			return {
				...acc,
				[fieldKey(name, field.required)]: wabeTypesToTypescriptTypes({
					field,
					isInput: true,
					formatOptions,
				}),
			}
		},
		{} as Record<string, string>,
	)

	const prettyName = firstLetterInUpperCase(mutationOrQueryName)

	return {
		...(isMutation ? { [`${prettyName}Input`]: resolvedArgs } : {}),
		[`${isMutation ? 'Mutation' : 'Query'}${prettyName}Args`]: isMutation
			? { input: `${prettyName}Input` }
			: resolvedArgs,
		...mergeNestedStringRecords(objectsToLoad),
	}
}

const generateWabeMutationsAndQueriesTypes = (
	resolver: TypeResolver<any>,
	formatOptions?: CodegenFormatOptions,
) => ({
	...Object.entries(resolver.mutations || {}).reduce(
		(acc, [name, mutation]) => ({
			...acc,
			...generateWabeMutationOrQueryInput(name, mutation, true, formatOptions),
		}),
		{},
	),
	...Object.entries(resolver.queries || {}).reduce(
		(acc, [name, query]) => ({
			...acc,
			...generateWabeMutationOrQueryInput(name, query, false, formatOptions),
		}),
		{},
	),
})

export const wabeClassRecordToString = (
	wabeClass: Record<string, Record<string, string>>,
	options?: CodegenFormatOptions,
) => {
	const indent = getIndent(options)
	const endChar = getEndChar(options)

	return Object.entries(wabeClass).reduce((acc, [className, fields]) => {
		if (Object.keys(fields).length === 0) return `${acc}export type ${className} = {}\n\n`

		const body = Object.entries(fields)
			.map(([name, type]) => `${indent}${name.replace('undefined', '?')}: ${type}`)
			.join(`${endChar}\n`)

		return `${acc}export type ${className} = {\n${body}${endChar}\n}\n\n`
	}, '')
}

export const wabeEnumRecordToString = (
	wabeEnum: Record<string, Record<string, string>>,
	options?: CodegenFormatOptions,
) => {
	const indent = getIndent(options)
	const endChar = options?.semi ? ';' : (options?.comma ?? true) ? ',' : ''
	const quote = getQuoteChar(options)

	return Object.entries(wabeEnum).reduce((acc, [enumName, values]) => {
		const hasValues = Object.keys(values).length > 0
		const body = Object.entries(values)
			.map(([k, v]) => `${indent}${k} = ${quote}${v}${quote}`)
			.join(`${endChar}\n`)

		return `${acc}export enum ${enumName} {\n${body}${hasValues ? endChar : ''}\n}\n\n`
	}, '')
}

export const wabeScalarRecordToString = (wabeScalar: Record<string, string>) =>
	Object.entries(wabeScalar).reduce(
		(acc, [name, type]) => `${acc}export type ${name} = ${type}\n\n`,
		'',
	)

export const wrapLongGraphqlFieldArguments = ({
	content,
	indent,
	printWidth,
}: {
	content: string
	indent: string
	printWidth: number
}) =>
	content
		.split('\n')
		.map((line) => {
			if (line.length <= printWidth) return line

			const match = line.match(/^(\s*)([_A-Za-z][_0-9A-Za-z]*)\((.+)\):\s*(.+)$/)
			if (!match) return line

			const [, fieldIndent = '', fieldName = '', argsString = '', returnType = ''] = match
			if (!fieldName || !argsString || !returnType) return line

			const args = argsString
				.split(',')
				.map((arg) => arg.trim())
				.filter((arg) => arg.length > 0)

			if (args.length <= 1) return line

			const wrappedArgs = args.map((arg) => `${fieldIndent}${indent}${arg}`).join('\n')
			return `${fieldIndent}${fieldName}(\n${wrappedArgs}\n${fieldIndent}): ${returnType}`
		})
		.join('\n')

export const generateWabeDevTypes = ({
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
	const indent = getIndent(options)
	const endChar = getEndChar(options)
	const quote = getQuoteChar(options)

	const wabeScalarType =
		scalars && scalars.length > 0
			? `export type WabeSchemaScalars = ${scalars.map((s) => `${quote}${s.name}${quote}`).join(' | ')}`
			: `export type WabeSchemaScalars = ${quote}${quote}`

	const buildTypeMap = (typeName: string, entries: string[]) =>
		entries.length > 0
			? `export type ${typeName} = {\n${indent}${entries.join(`${endChar}\n${indent}`)}${endChar}\n}`
			: ''

	const wabeEnumsString = buildTypeMap(
		'WabeSchemaEnums',
		enums?.map((e) => `${e.name}: ${e.name}`) ?? [],
	)

	const wabeTypesString = buildTypeMap(
		'WabeSchemaTypes',
		classes.map((c) => `${c.name}: ${c.name}`),
	)

	const wabeWhereString = buildTypeMap(
		'WabeSchemaWhereTypes',
		classes.map((c) => `${c.name}: Where${firstLetterUpperCase(c.name)}`),
	)

	return `${wabeScalarType}\n\n${wabeEnumsString}\n\n${wabeTypesString}\n\n${wabeWhereString}`
}

const normalizeGraphqlSchemaForComparison = (schemaContent: string) => {
	try {
		return print(parse(schemaContent))
	} catch {
		return schemaContent
	}
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

	const indentStr = getIndent(options)
	const printWidth = options?.printWidth ?? 100
	const shouldEnsureFinalNewline = options?.finalNewline ?? true
	const shouldUseSemanticComparison = options?.semanticCompare ?? true

	if (indentStr !== '  ') {
		graphqlSchemaContent = graphqlSchemaContent.replaceAll('  ', indentStr)
	}

	graphqlSchemaContent = graphqlSchemaContent.replace(
		/(^[ \t]*)"""([^\n"]+)"""(?=\n)/gm,
		(_, indentation: string, description: string) =>
			`${indentation}"""\n${indentation}${description}\n${indentation}"""`,
	)

	graphqlSchemaContent = wrapLongGraphqlFieldArguments({
		content: graphqlSchemaContent,
		indent: indentStr,
		printWidth,
	})

	if (shouldEnsureFinalNewline && !graphqlSchemaContent.endsWith('\n')) {
		graphqlSchemaContent += '\n'
	}

	const classes = schema.classes ?? []
	const resolvers = schema.resolvers ?? {}
	const enums = schema.enums ?? []
	const scalars = schema.scalars ?? []

	const wabeClasses = generateClassTypes(classes, options)
	const wabeWhereTypes = generateClassTypes(classes, options, 'Where', true)
	const mutationsAndQueries = generateWabeMutationsAndQueriesTypes(resolvers, options)

	const wabeEnumsInString = wabeEnumRecordToString(generateWabeEnumTypes(enums), options)
	const wabeScalarsInString = wabeScalarRecordToString(generateWabeScalarTypes(scalars))
	const wabeObjectsInString = wabeClassRecordToString(
		{ ...wabeClasses, ...wabeWhereTypes, ...mutationsAndQueries },
		options,
	)

	const wabeDevTypes = generateWabeDevTypes({ scalars, enums, classes, options })

	const wabeTsContent = `${wabeEnumsInString}${wabeScalarsInString}${wabeObjectsInString}${wabeDevTypes}\n`

	let shouldWriteGraphqlSchema = true
	try {
		const contentOfGraphqlSchema = (await readFile(`${path}/schema.graphql`)).toString()
		const schemasAreEqual =
			contentOfGraphqlSchema === graphqlSchemaContent ||
			(shouldUseSemanticComparison &&
				normalizeGraphqlSchemaForComparison(contentOfGraphqlSchema) ===
					normalizeGraphqlSchemaForComparison(graphqlSchemaContent))

		shouldWriteGraphqlSchema = !schemasAreEqual
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
