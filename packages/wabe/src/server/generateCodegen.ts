import { type GraphQLSchema, parse, print, printSchema } from 'graphql'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
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
import { firstLetterInUpperCase } from '../utils'

const firstLetterUpperCase = (str: string): string => str.charAt(0).toUpperCase() + str.slice(1)

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

const inlineObjectTypeMemberSep = '; '

const getFileOutputTypeString = () =>
	`{ name: string${inlineObjectTypeMemberSep}url?: string${inlineObjectTypeMemberSep}urlGeneratedAt?: string${inlineObjectTypeMemberSep}isPresignedUrl: boolean }`

const getFileInputTypeString = () =>
	`{ file: File${inlineObjectTypeMemberSep}url?: never${inlineObjectTypeMemberSep}name?: never } | { file?: never${inlineObjectTypeMemberSep}url: string${inlineObjectTypeMemberSep}name: string }`

const getFileTypeString = (isInput = false) =>
	isInput ? getFileInputTypeString() : getFileOutputTypeString()

const wabeTypesToTypescriptTypes = ({
	field,
	isInput = false,
}: {
	field: TypeField<any>
	isInput?: boolean
}) => {
	const typedField = field as TypeField<any> & {
		typeValue?: string
		object?: { name: string; fields: Record<string, TypeField<any>> }
		class?: string
	}

	switch (field.type) {
		case 'Date':
			return isInput ? 'Date' : 'string'
		case 'File':
			return getFileTypeString(isInput)
		case 'Boolean':
		case 'Int':
		case 'Float':
		case 'String':
		case 'Any':
		case 'Email':
		case 'Phone':
		case 'Hash':
			return wabePrimaryTypesToTypescriptTypes[
				field.type as keyof typeof wabePrimaryTypesToTypescriptTypes
			]
		case 'Array':
			if (typedField.typeValue === 'Object' && typedField.object)
				return `Array<${typedField.object.name}>`
			if (typedField.typeValue === 'File') return `Array<${getFileTypeString(isInput)}>`
			return `Array<${wabePrimaryTypesToTypescriptTypes[typedField.typeValue as keyof typeof wabePrimaryTypesToTypescriptTypes]}>`
		case 'Pointer':
			return typedField.class || 'any'
		case 'Relation':
			return `Array<${typedField.class || 'any'}>`
		case 'Object':
			return typedField.object?.name || 'any'
		default:
			return field.type
	}
}

const fieldKey = (name: string, required?: boolean) => `${name}${required ? '' : 'undefined'}`

const generateWabeObject = ({
	object,
	isInput = false,
	prefix = '',
}: {
	object: WabeObject<any>
	prefix?: string
	isInput?: boolean
}): Record<string, Record<string, string>> => {
	const objectNameWithPrefix = `${prefix}${firstLetterUpperCase(object.name)}`

	return Object.entries(object.fields).reduce(
		(acc, [fieldName, field]) => {
			const typedField = field as TypeField<any> & {
				typeValue?: string
				object?: WabeObject<any>
			}
			const type = wabeTypesToTypescriptTypes({ field, isInput })

			if (
				field.type === 'Object' ||
				(field.type === 'Array' && typedField.typeValue === 'Object' && typedField.object)
			) {
				const subObject = generateWabeObject({
					object: typedField.object as WabeObject<any>,
					isInput,
					prefix: objectNameWithPrefix,
				})

				const isArray = field.type === 'Array'
				const subTypeName = `${objectNameWithPrefix}${firstLetterUpperCase(
					typedField.object?.name || 'Object',
				)}`

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

const generateClassTypes = (classes: ClassInterface<any>[], namePrefix = '', isInput = false) =>
	classes.reduce(
		(acc, { name, fields }) => {
			const objectsToLoad: Array<Record<string, Record<string, string>>> = []

			const currentClass = Object.entries(fields).reduce(
				(acc2, [fieldName, field]) => {
					const typedField = field as TypeField<any> & {
						typeValue?: string
						object?: WabeObject<any>
					}
					const type = wabeTypesToTypescriptTypes({ field, isInput })

					if (
						field.type === 'Object' ||
						(field.type === 'Array' && typedField.typeValue === 'Object' && typedField.object)
					) {
						objectsToLoad.push(
							generateWabeObject({
								object: typedField.object as WabeObject<any>,
								isInput,
							}),
						)
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

const generateWabeMutationsAndQueriesTypes = (resolver: TypeResolver<any>) => ({
	...Object.entries(resolver.mutations || {}).reduce(
		(acc, [name, mutation]) => ({
			...acc,
			...generateWabeMutationOrQueryInput(name, mutation, true),
		}),
		{},
	),
	...Object.entries(resolver.queries || {}).reduce(
		(acc, [name, query]) => ({
			...acc,
			...generateWabeMutationOrQueryInput(name, query, false),
		}),
		{},
	),
})

const wabeClassRecordToString = (wabeClass: Record<string, Record<string, string>>) =>
	Object.entries(wabeClass).reduce((acc, [className, fields]) => {
		if (Object.keys(fields).length === 0) return `${acc}export type ${className} = {}\n\n`

		const body = Object.entries(fields)
			.map(([name, type]) => `\t${name.replace('undefined', '?')}: ${type}`)
			.join('\n')

		return `${acc}export type ${className} = {\n${body}\n}\n\n`
	}, '')

const wabeEnumRecordToString = (wabeEnum: Record<string, Record<string, string>>) =>
	Object.entries(wabeEnum).reduce((acc, [enumName, values]) => {
		const hasValues = Object.keys(values).length > 0
		const body = Object.entries(values)
			.map(([k, v]) => `\t${k} = '${v}'`)
			.join(',\n')

		return `${acc}export enum ${enumName} {\n${body}${hasValues ? ',' : ''}\n}\n\n`
	}, '')

const wabeScalarRecordToString = (wabeScalar: Record<string, string>) =>
	Object.entries(wabeScalar).reduce(
		(acc, [name, type]) => `${acc}export type ${name} = ${type}\n\n`,
		'',
	)

const wrapLongGraphqlFieldArguments = ({
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

const generateWabeDevTypes = ({
	scalars,
	enums,
	classes,
}: {
	enums?: EnumInterface[]
	scalars?: ScalarInterface[]
	classes: ClassInterface<any>[]
}) => {
	const wabeScalarType =
		scalars && scalars.length > 0
			? `export type WabeSchemaScalars = ${scalars.map((s) => `'${s.name}'`).join(' | ')}`
			: `export type WabeSchemaScalars = ''`

	const buildTypeMap = (typeName: string, entries: string[]) =>
		entries.length > 0 ? `export type ${typeName} = {\n\t${entries.join('\n\t')}\n}` : ''

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
}: {
	schema: SchemaInterface<any>
	path: string
	graphqlSchema: GraphQLSchema
}) => {
	await mkdir(path, { recursive: true })

	let graphqlSchemaContent = printSchema(graphqlSchema)
	const indentStr = '\t'
	const printWidth = 100

	graphqlSchemaContent = graphqlSchemaContent.replaceAll('  ', indentStr)
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
	if (!graphqlSchemaContent.endsWith('\n')) graphqlSchemaContent += '\n'

	const classes = schema.classes ?? []
	const resolvers = schema.resolvers ?? {}
	const enums = schema.enums ?? []
	const scalars = schema.scalars ?? []

	const wabeClasses = generateClassTypes(classes)
	const wabeWhereTypes = generateClassTypes(classes, 'Where', true)
	const mutationsAndQueries = generateWabeMutationsAndQueriesTypes(resolvers)

	const wabeEnumsInString = wabeEnumRecordToString(generateWabeEnumTypes(enums))
	const wabeScalarsInString = wabeScalarRecordToString(generateWabeScalarTypes(scalars))
	const wabeObjectsInString = wabeClassRecordToString({
		...wabeClasses,
		...wabeWhereTypes,
		...mutationsAndQueries,
	})

	const wabeDevTypes = generateWabeDevTypes({ scalars, enums, classes })
	const wabeTsContent = `${wabeEnumsInString}${wabeScalarsInString}${wabeObjectsInString}${wabeDevTypes}\n`

	let shouldWriteGraphqlSchema = true
	try {
		const contentOfGraphqlSchema = (await readFile(`${path}/schema.graphql`)).toString()
		const schemasAreEqual =
			contentOfGraphqlSchema === graphqlSchemaContent ||
			normalizeGraphqlSchemaForComparison(contentOfGraphqlSchema) ===
				normalizeGraphqlSchemaForComparison(graphqlSchemaContent)
		shouldWriteGraphqlSchema = !schemasAreEqual
	} catch {}

	await writeFile(`${path}/wabe.ts`, wabeTsContent)
	if (shouldWriteGraphqlSchema) await writeFile(`${path}/schema.graphql`, graphqlSchemaContent)
}
