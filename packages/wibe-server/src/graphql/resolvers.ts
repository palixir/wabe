import type { GraphQLResolveInfo, SelectionSetNode } from 'graphql'
import { WibeApp } from '../..'
import type { WibeSchemaTypes } from '../../generated/wibe'
import type { Context } from '../graphql/interface'
import { firstLetterInLowerCase } from '../utils'
import { allocUnsafe } from 'bun'

const ignoredFields = ['edges', 'node']

export const getFieldsFromInfo = (
	selectionSet: SelectionSetNode,
	className?: keyof WibeSchemaTypes,
): Array<any> => {
	if (className) ignoredFields.push(firstLetterInLowerCase(className))

	return selectionSet.selections
		?.flatMap((selection) => {
			//@ts-expect-error
			const currentValue = selection.name.value

			if (
				//@ts-expect-error
				selection.selectionSet?.selections &&
				//@ts-expect-error
				selection.selectionSet?.selections?.length > 0
			) {
				//@ts-expect-error
				const res = getFieldsFromInfo(selection.selectionSet, className)

				if (ignoredFields.indexOf(currentValue) === -1)
					return res.map((field) => `${currentValue}.${field}`)

				return res
			}

			return currentValue
		})
		.filter((value) => ignoredFields.indexOf(value) === -1)
}

export const executeRelationOnFields = async ({
	className,
	fields,
	context,
	id,
	typeOfExecution,
	where,
}: {
	className: string
	fields: Record<string, any>
	context: Context
	id?: string
	where?: any
	typeOfExecution?: 'create' | 'update' | 'updateMany'
}) => {
	const entries = Object.entries(fields)

	return entries.reduce(
		async (acc, [fieldName, value]) => {
			const newAcc = await acc

			if (typeof value === 'object' && value?.createAndLink) {
				const { createAndLink } = value

				const classInSchema = WibeApp.config.schema.class.find(
					(schemaClass) => schemaClass.fields[fieldName],
				)

				if (!classInSchema) throw new Error('Class not found in schema')

				const fieldInClass = classInSchema?.fields[fieldName]

				const { id } = await WibeApp.databaseController.createObject({
					// @ts-expect-error
					className: fieldInClass.class,
					data: createAndLink,
					fields: ['id'],
					context,
				})

				newAcc[fieldName] = id
			} else if (typeof value === 'object' && value?.link) {
				newAcc[fieldName] = value.link
			} else if (typeof value === 'object' && value?.createAndAdd) {
				const { createAndAdd } = value

				const classInSchema = WibeApp.config.schema.class.find(
					(schemaClass) => schemaClass.fields[fieldName],
				)

				if (!classInSchema) throw new Error('Class not found in schema')

				const fieldInClass = classInSchema?.fields[fieldName]

				const result = await WibeApp.databaseController.createObjects({
					// @ts-expect-error
					className: fieldInClass.class,
					data: createAndAdd,
					fields: ['id'],
					context,
				})

				console.log(result)

				newAcc[fieldName] = result.map((object: any) => object.id)
			} else if (value?.add) {
				if (typeOfExecution === 'create') {
					newAcc[fieldName] = value.add
				}

				// If update we get the current value and add the new value (we need to concat)
				if (typeOfExecution === 'update' && id) {
					const classInSchema = WibeApp.config.schema.class.find(
						(classItem) => classItem.name === className,
					)

					if (!classInSchema)
						throw new Error('Class not found in schema')

					const fieldInClass = classInSchema?.fields[fieldName]

					const currentValue =
						await WibeApp.databaseController.getObject({
							// @ts-expect-error
							className: fieldInClass.class,
							id,
							fields: [fieldName],
						})

					newAcc[fieldName] = [
						...(currentValue?.[fieldName] || []),
						...value.add,
					]
				}

				// For update many we need to get all objects that match the where and add the new value
				// So we doesn't update the field for updateMany
				if (typeOfExecution === 'updateMany' && where) {
					const classInSchema = WibeApp.config.schema.class.find(
						(classItem) => classItem.name === className,
					)

					if (!classInSchema)
						throw new Error('Class not found in schema')

					const fieldInClass = classInSchema?.fields[fieldName]

					const allObjectsMatchedWithWhere =
						await WibeApp.databaseController.getObjects({
							// @ts-expect-error
							className: fieldInClass.class,
							where,
							fields: [fieldName],
						})

					await Promise.all(
						allObjectsMatchedWithWhere.map(async (object: any) => {
							const currentValue = object[fieldName]

							await WibeApp.databaseController.updateObject({
								// @ts-expect-error
								className: fieldInClass.class,
								id: object.id,
								data: {
									[fieldName]: [
										...(currentValue || []),
										...value.add,
									],
								},
								context,
							})
						}),
					)
				}
			} else if (value?.remove) {
				if (typeOfExecution === 'create') newAcc[fieldName] = []

				if (typeOfExecution === 'update' && id) {
					const classInSchema = WibeApp.config.schema.class.find(
						(classItem) => classItem.name === className,
					)

					if (!classInSchema)
						throw new Error('Class not found in schema')

					const fieldInClass = classInSchema?.fields[fieldName]

					const currentValue =
						await WibeApp.databaseController.getObject({
							// @ts-expect-error
							className: fieldInClass.class,
							id,
							fields: [fieldName],
						})

					const olderValue = currentValue?.[fieldName] || []

					newAcc[fieldName] = olderValue.filter(
						(olderVal: any) => !value.remove.includes(olderVal),
					)
				}

				if (typeOfExecution === 'updateMany' && where) {
					const classInSchema = WibeApp.config.schema.class.find(
						(classItem) => classItem.name === className,
					)

					if (!classInSchema)
						throw new Error('Class not found in schema')

					const fieldInClass = classInSchema?.fields[fieldName]

					const allObjectsMatchedWithWhere =
						await WibeApp.databaseController.getObjects({
							// @ts-expect-error
							className: fieldInClass.class,
							where,
							fields: [fieldName],
						})

					await Promise.all(
						allObjectsMatchedWithWhere.map(async (object: any) => {
							const currentValue = object[fieldName]

							const olderValue = currentValue?.[fieldName] || []

							await WibeApp.databaseController.updateObject({
								// @ts-expect-error
								className: fieldInClass.class,
								id: object.id,
								data: {
									[fieldName]: olderValue.filter(
										(olderVal: any) =>
											!value.remove.includes(olderVal),
									),
								},
								context,
							})
						}),
					)
				}
			} else {
				newAcc[fieldName] = value
			}

			return newAcc
		},
		Promise.resolve({}) as Promise<Record<string, any>>,
	)
}

export const queryForOneObject = (
	_: any,
	{ id }: any,
	__: any,
	info: GraphQLResolveInfo,
	className: keyof WibeSchemaTypes,
) => {
	const selectionSet = info.fieldNodes[0].selectionSet

	if (!selectionSet) throw new Error('No output fields provided')

	const fields = getFieldsFromInfo(selectionSet, className)

	if (!fields) throw new Error('No fields provided')

	return WibeApp.databaseController.getObject({
		className,
		id,
		fields,
	})
}

export const queryForMultipleObject = async (
	_: any,
	{ where, offset, limit }: any,
	__: any,
	info: GraphQLResolveInfo,
	className: keyof WibeSchemaTypes,
) => {
	const selectionSet = info.fieldNodes[0].selectionSet

	if (!selectionSet) throw new Error('No output fields provided')

	const fields = getFieldsFromInfo(selectionSet, className)

	if (!fields) throw new Error('No fields provided')

	const objects = await WibeApp.databaseController.getObjects({
		className,
		where,
		fields,
		offset,
		limit,
	})

	return {
		edges: objects.map((object: any) => ({
			node: object,
		})),
	}
}

export const mutationToCreateObject = async (
	_: any,
	args: any,
	context: Context,
	info: GraphQLResolveInfo,
	className: keyof WibeSchemaTypes,
) => {
	const selectionSet = info.fieldNodes[0].selectionSet

	if (!selectionSet) throw new Error('No output fields provided')

	const fields = getFieldsFromInfo(selectionSet, className)

	if (!fields) throw new Error('No fields provided')

	const classNameWithFirstLetterLowercase = firstLetterInLowerCase(className)

	const updatedFieldsToCreate = await executeRelationOnFields({
		className,
		fields: args.input?.fields,
		context,
	})

	return {
		[classNameWithFirstLetterLowercase]:
			await WibeApp.databaseController.createObject({
				className,
				data: updatedFieldsToCreate,
				fields,
				context,
			}),
	}
}

export const mutationToCreateMultipleObjects = async (
	_: any,
	args: any,
	context: Context,
	info: GraphQLResolveInfo,
	className: keyof WibeSchemaTypes,
) => {
	const selectionSet = info.fieldNodes[0].selectionSet

	if (!selectionSet) throw new Error('No output fields provided')

	const fields = getFieldsFromInfo(selectionSet, className)

	if (!fields) throw new Error('No fields provided')

	const inputFields = args.input?.fields as Array<any>

	const updatedFieldsToCreate = await Promise.all(
		inputFields.map((inputField) =>
			executeRelationOnFields({
				className,
				fields: inputField,
				context,
			}),
		),
	)

	const objects = await WibeApp.databaseController.createObjects({
		className,
		data: updatedFieldsToCreate,
		fields,
		offset: args.input?.offset,
		limit: args.input?.limit,
		context,
	})

	return {
		edges: objects.map((object: any) => ({ node: object })),
	}
}

export const mutationToUpdateObject = async (
	_: any,
	args: any,
	context: Context,
	info: GraphQLResolveInfo,
	className: keyof WibeSchemaTypes,
) => {
	const selectionSet = info.fieldNodes[0].selectionSet

	if (!selectionSet) throw new Error('No output fields provided')

	const fields = getFieldsFromInfo(selectionSet, className)

	if (!fields) throw new Error('No fields provided')

	const classNameWithFirstLetterLowercase = firstLetterInLowerCase(className)

	const updatedFields = await executeRelationOnFields({
		className,
		fields: args.input?.fields,
		context,
	})

	return {
		[classNameWithFirstLetterLowercase]:
			await WibeApp.databaseController.updateObject({
				className,
				id: args.input?.id,
				data: updatedFields,
				fields,
				context,
			}),
	}
}

export const mutationToUpdateMultipleObjects = async (
	_: any,
	args: any,
	context: Context,
	info: GraphQLResolveInfo,
	className: keyof WibeSchemaTypes,
) => {
	const selectionSet = info.fieldNodes[0].selectionSet

	if (!selectionSet) throw new Error('No output fields provided')

	const fields = getFieldsFromInfo(selectionSet, className)

	if (!fields) throw new Error('No fields provided')

	const updatedFields = await executeRelationOnFields({
		className,
		fields: args.input?.fields,
		context,
	})

	const objects = await WibeApp.databaseController.updateObjects({
		className,
		where: args.input?.where,
		data: updatedFields,
		fields,
		offset: args.input?.offset,
		limit: args.input?.limit,
		context,
	})

	return {
		edges: objects.map((object: any) => ({ node: object })),
	}
}

export const mutationToDeleteObject = async (
	_: any,
	args: any,
	context: Context,
	info: GraphQLResolveInfo,
	className: keyof WibeSchemaTypes,
) => {
	const selectionSet = info.fieldNodes[0].selectionSet

	if (!selectionSet) throw new Error('No output fields provided')

	const fields = getFieldsFromInfo(selectionSet, className)

	if (!fields) throw new Error('No fields provided')

	const classNameWithFirstLetterLowercase = firstLetterInLowerCase(className)

	return {
		[classNameWithFirstLetterLowercase]:
			await WibeApp.databaseController.deleteObject({
				className,
				id: args.input?.id,
				fields,
				context,
			}),
	}
}

export const mutationToDeleteMultipleObjects = async (
	_: any,
	args: any,
	context: Context,
	info: GraphQLResolveInfo,
	className: keyof WibeSchemaTypes,
) => {
	const selectionSet = info.fieldNodes[0].selectionSet

	if (!selectionSet) throw new Error('No output fields provided')

	const fields = getFieldsFromInfo(selectionSet, className)

	if (!fields) throw new Error('No fields provided')

	const objects = await WibeApp.databaseController.deleteObjects({
		className,
		where: args.input?.where,
		fields,
		offset: args.input?.offset,
		limit: args.input?.limit,
		context,
	})

	return {
		edges: objects.map((object: any) => ({ node: object })),
	}
}
