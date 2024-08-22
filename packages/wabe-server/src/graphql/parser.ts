import {
	GraphQLBoolean,
	type GraphQLEnumType,
	type GraphQLFieldConfig,
	GraphQLFloat,
	GraphQLInputObjectType,
	GraphQLInt,
	GraphQLList,
	GraphQLNonNull,
	GraphQLObjectType,
	type GraphQLScalarType,
	GraphQLString,
} from 'graphql'
import {
	type AllObjects,
	AnyWhereInput,
	ArrayWhereInput,
	BooleanWhereInput,
	DateScalarType,
	DateWhereInput,
	EmailScalarType,
	EmailWhereInput,
	FileScalarType,
	FileWhereInput,
	FloatWhereInput,
	IntWhereInput,
	StringWhereInput,
} from '../graphql'
import type { ClassInterface, SchemaFields, WibePrimaryTypes } from '../schema'
import type { WibeAppTypes } from '../server'
import type { DevWibeAppTypes } from '../utils/helper'

type GraphqlObjectType =
	| 'Object'
	| 'InputObject'
	| 'CreateFieldsInput'
	| 'UpdateFieldsInput'
	| 'WhereInputObject'

type ParseObjectOptions = {
	required?: boolean
	description?: string
	objectToParse: ClassInterface<any>
	nameOfTheObject: string
}

type ParseObjectCallback = (options: ParseObjectOptions) => any

export const templateScalarType: Record<WibePrimaryTypes, GraphQLScalarType> = {
	String: GraphQLString,
	Int: GraphQLInt,
	Float: GraphQLFloat,
	Boolean: GraphQLBoolean,
	Date: DateScalarType,
	Email: EmailScalarType,
	File: FileScalarType,
}

export const templateWhereInput: Record<
	WibePrimaryTypes | 'Array',
	GraphQLInputObjectType
> = {
	String: StringWhereInput,
	Int: IntWhereInput,
	Float: FloatWhereInput,
	Boolean: BooleanWhereInput,
	Date: DateWhereInput,
	Email: EmailWhereInput,
	Array: ArrayWhereInput,
	File: FileWhereInput,
}

interface GraphqlParserFactoryOptions {
	graphqlObjectType: GraphqlObjectType
	allObjects: AllObjects
	schemaFields: SchemaFields<DevWibeAppTypes>
}

interface GraphqlParserConstructorOptions {
	scalars: GraphQLScalarType[]
	enums: GraphQLEnumType[]
}

export type GraphqlParserFactory = (options: GraphqlParserFactoryOptions) => {
	_parseWibeObject(options: ParseObjectOptions): any
	_parseWibeWhereInputObject(options: ParseObjectOptions): any
	_parseWibeInputObject(options: ParseObjectOptions): any
	_parseWibeUpdateInputObject(options: ParseObjectOptions): any
	getGraphqlType(options: {
		type: WibePrimaryTypes | 'Array'
		typeValue?: WibePrimaryTypes
		isWhereType?: boolean
	}): any
	getGraphqlFields(nameOfTheObject: string): any
}

export type GraphqlParserConstructor = (
	options: GraphqlParserConstructorOptions,
) => GraphqlParserFactory

export const GraphqlParser: GraphqlParserConstructor =
	({ scalars, enums }: GraphqlParserConstructorOptions) =>
	({
		graphqlObjectType,
		schemaFields,
		allObjects,
	}: GraphqlParserFactoryOptions) => {
		// Get graphql fields from a wibe object
		const _getGraphqlFieldsFromAnObject = ({
			objectToParse,
			callBackForObjectType,
			forceRequiredToFalse = false,
			isWhereType = false,
			nameOfTheObject,
		}: {
			objectToParse: ClassInterface<DevWibeAppTypes>
			forceRequiredToFalse?: boolean
			isWhereType?: boolean
			callBackForObjectType: ParseObjectCallback
			nameOfTheObject: string
		}) => {
			const fields = objectToParse.fields

			const graphqlFields = Object.keys(fields).reduce(
				(acc, key) => {
					const currentField = fields[key]

					const keyWithFirstLetterUppercase = `${key
						.charAt(0)
						.toUpperCase()}${key.slice(1)}`

					if (currentField.type === 'Object') {
						acc[key] = {
							type: callBackForObjectType({
								required: currentField.object.required,
								description: currentField.description,
								objectToParse: currentField.object,
								nameOfTheObject: `${nameOfTheObject}${keyWithFirstLetterUppercase}`,
							}),
						}

						return acc
					}

					if (currentField.type === 'Array') {
						if (currentField.typeValue === 'Object') {
							const objectList = new GraphQLList(
								callBackForObjectType({
									required: currentField.object.required,
									description: currentField.description,
									objectToParse: currentField.object,
									nameOfTheObject: `${nameOfTheObject}${currentField.object.name}`,
								}),
							)

							acc[key] = {
								type: currentField.required
									? new GraphQLNonNull(objectList)
									: objectList,
							}
						}

						return acc
					}

					const graphqlType = getGraphqlType({
						...currentField,
						// We never come here, complicated to good type this
						type: currentField.type as WibePrimaryTypes,
						isWhereType,
					})

					acc[key] = {
						type:
							currentField.required && !forceRequiredToFalse
								? new GraphQLNonNull(graphqlType)
								: graphqlType,
					}

					return acc
				},
				{} as Record<string, any>,
			)

			return graphqlFields
		}

		// ------------------ Parsers ------------------

		// Parse simple object
		const _parseWibeObject = ({
			required,
			description,
			objectToParse,
			nameOfTheObject,
		}: ParseObjectOptions) => {
			const graphqlFields = _getGraphqlFieldsFromAnObject({
				objectToParse,
				callBackForObjectType: _parseWibeObject,
				nameOfTheObject,
			})

			const graphqlObject = new GraphQLObjectType({
				name: nameOfTheObject,
				description: description,
				fields: graphqlFields,
			})

			return required ? new GraphQLNonNull(graphqlObject) : graphqlObject
		}

		// Parse input object
		const _parseWibeInputObject = ({
			required,
			description,
			objectToParse,
			nameOfTheObject,
		}: ParseObjectOptions) => {
			const graphqlFields = _getGraphqlFieldsFromAnObject({
				objectToParse,
				callBackForObjectType: _parseWibeInputObject,
				nameOfTheObject,
			})

			const graphqlObject = new GraphQLInputObjectType({
				name: `${nameOfTheObject}Input`,
				description: description,
				fields: graphqlFields,
			})

			return required ? new GraphQLNonNull(graphqlObject) : graphqlObject
		}

		// Parse create input object
		const _parseWibeCreateInputObject = ({
			required,
			description,
			objectToParse,
			nameOfTheObject,
		}: ParseObjectOptions) => {
			const graphqlFields = _getGraphqlFieldsFromAnObject({
				objectToParse,
				callBackForObjectType: _parseWibeCreateInputObject,
				forceRequiredToFalse: true,
				nameOfTheObject,
			})

			const graphqlObject = new GraphQLInputObjectType({
				name: `${nameOfTheObject}CreateFieldsInput`,
				description: description,
				fields: graphqlFields,
			})

			return required ? new GraphQLNonNull(graphqlObject) : graphqlObject
		}

		// Parse update input object
		const _parseWibeUpdateInputObject = ({
			required,
			description,
			objectToParse,
			nameOfTheObject,
		}: ParseObjectOptions) => {
			const graphqlFields = _getGraphqlFieldsFromAnObject({
				objectToParse,
				callBackForObjectType: _parseWibeUpdateInputObject,
				forceRequiredToFalse: true,
				nameOfTheObject,
			})

			const graphqlObject = new GraphQLInputObjectType({
				name: `${nameOfTheObject}UpdateFieldsInput`,
				description: description,
				fields: graphqlFields,
			})

			return required ? new GraphQLNonNull(graphqlObject) : graphqlObject
		}

		// Parse where input object
		const _parseWibeWhereInputObject = ({
			required,
			description,
			objectToParse,
			nameOfTheObject,
		}: ParseObjectOptions) => {
			const graphqlFields = _getGraphqlFieldsFromAnObject({
				objectToParse,
				callBackForObjectType: _parseWibeWhereInputObject,
				forceRequiredToFalse: true,
				isWhereType: true,
				nameOfTheObject,
			})

			// @ts-expect-error
			const graphqlObject = new GraphQLInputObjectType({
				name: `${nameOfTheObject}WhereInput`,
				description: description,
				fields: () => ({
					...graphqlFields,
					...{
						OR: {
							type: new GraphQLList(graphqlObject),
						},
						AND: {
							type: new GraphQLList(graphqlObject),
						},
					},
				}),
			})

			return required ? new GraphQLNonNull(graphqlObject) : graphqlObject
		}

		const _graphqlObjectFactory: Record<
			GraphqlObjectType,
			{
				callback: ParseObjectCallback
				isWhereType: boolean
				forceRequiredToFalse: boolean
			}
		> = {
			Object: {
				callback: _parseWibeObject,
				isWhereType: false,
				forceRequiredToFalse: false,
			},
			InputObject: {
				callback: _parseWibeInputObject,
				isWhereType: false,
				forceRequiredToFalse: false,
			},
			CreateFieldsInput: {
				callback: _parseWibeCreateInputObject,
				isWhereType: false,
				forceRequiredToFalse: true,
			},
			UpdateFieldsInput: {
				callback: _parseWibeUpdateInputObject,
				isWhereType: false,
				forceRequiredToFalse: true,
			},
			WhereInputObject: {
				callback: _parseWibeWhereInputObject,
				isWhereType: true,
				forceRequiredToFalse: true,
			},
		}

		// Get the good graphql type for a field
		const getGraphqlType = ({
			type,
			typeValue,
			requiredValue,
			isWhereType = false,
		}: {
			type:
				| WibePrimaryTypes
				| 'Array'
				| WibeAppTypes['enums']
				| WibeAppTypes['scalars']
			typeValue?: WibePrimaryTypes
			requiredValue?: boolean
			isWhereType?: boolean
		}) => {
			const scalarExist = scalars.find((scalar) => scalar.name === type)

			const enumExist = enums.find((e) => e.name === type)

			if (isWhereType) {
				if (!Object.keys(templateWhereInput).includes(type))
					return AnyWhereInput

				return templateWhereInput[type as WibePrimaryTypes]
			}

			if (scalarExist) return scalarExist
			if (enumExist) return enumExist

			const graphqlType =
				type === 'Array' && typeValue
					? new GraphQLList(
							requiredValue
								? new GraphQLNonNull(
										templateScalarType[typeValue],
									)
								: templateScalarType[typeValue],
						)
					: // @ts-expect-error
						templateScalarType[type]

			if (!graphqlType) throw new Error(`${type} not exist in schema`)

			return graphqlType
		}

		// Get Graphql object from a schema fields passed in WibeGraphqlParser
		const getGraphqlFields = (nameOfTheObject: string) => {
			const { callback, forceRequiredToFalse, isWhereType } =
				_graphqlObjectFactory[graphqlObjectType]

			const keysOfObject = Object.keys(schemaFields)

			const rawFields = keysOfObject.reduce(
				(acc, key) => {
					const currentField = schemaFields[key]

					const isRelation = currentField.type === 'Relation'
					const isPointer = currentField.type === 'Pointer'

					if (isRelation || isPointer) {
						const graphqlObject = allObjects[currentField.class]

						switch (graphqlObjectType) {
							case 'Object': {
								acc[key] = {
									type: isRelation
										? graphqlObject.connectionObject
										: graphqlObject.object,
								}

								break
							}
							case 'UpdateFieldsInput':
							case 'CreateFieldsInput':
							case 'InputObject': {
								acc[key] = {
									type: isRelation
										? graphqlObject.relationInputObject
										: graphqlObject.pointerInputObject,
								}

								break
							}
							case 'WhereInputObject': {
								acc[key] = {
									type: allObjects[currentField.class]
										.whereInputObject,
								}

								break
							}
						}

						return acc
					}

					if (currentField.type === 'Object') {
						acc[key] = {
							type: callback({
								...currentField,
								objectToParse: currentField.object,
								nameOfTheObject: `${nameOfTheObject}${currentField.object.name}`,
							}),
						}

						return acc
					}

					if (currentField.type === 'Array') {
						if (currentField.typeValue === 'Object') {
							const objectList = new GraphQLList(
								callback({
									...currentField,
									required: currentField.object.required,
									objectToParse: currentField.object,
									nameOfTheObject: `${nameOfTheObject}${currentField.object.name}`,
								}),
							)

							acc[key] = {
								type: currentField.required
									? new GraphQLNonNull(objectList)
									: objectList,
							}

							return acc
						}
					}

					const graphqlType = getGraphqlType({
						...currentField,
						isWhereType,
					})

					acc[key] = {
						type:
							currentField.required && !forceRequiredToFalse
								? new GraphQLNonNull(graphqlType)
								: graphqlType,
					}

					return acc
				},
				{} as Record<string, any>,
			)

			return Object.keys(rawFields).reduce(
				(acc, key) => {
					const field = rawFields[key]

					acc[key] = field

					return acc
				},
				{} as Record<string, GraphQLFieldConfig<any, any, any>>,
			)
		}

		return {
			getGraphqlType,
			getGraphqlFields,
			_parseWibeObject,
			_parseWibeInputObject,
			_parseWibeUpdateInputObject,
			_parseWibeWhereInputObject,
		}
	}
