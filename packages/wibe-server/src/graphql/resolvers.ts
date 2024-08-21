import type { GraphQLResolveInfo, SelectionSetNode } from 'graphql'
import type { WibeAppTypes } from '..'
import type { WibeContext } from '../server/interface'
import { firstLetterInLowerCase } from '../utils'
import {
	type InputFields,
	type TypeOfExecution,
	add,
	createAndAdd,
	createAndLink,
	remove,
} from './pointerAndRelationFunction'

const ignoredFields = ['edges', 'node']

export const extractFieldsFromSetNode = (
	selectionSet: SelectionSetNode,
	className: string,
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
				const res = extractFieldsFromSetNode(
					//@ts-expect-error
					selection.selectionSet,
					className,
				)

				if (ignoredFields.indexOf(currentValue) === -1)
					return res.map((field) => `${currentValue}.${field}`)

				return res
			}

			return currentValue
		})
		.filter((value) => ignoredFields.indexOf(value) === -1)
}

const getFieldsFromInfo = (info: GraphQLResolveInfo, className: string) => {
	const selectionSet = info.fieldNodes[0].selectionSet

	if (!selectionSet) throw new Error('No output fields provided')

	const fields = extractFieldsFromSetNode(selectionSet, className)

	if (!fields) throw new Error('No fields provided')

	return fields
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
	fields: InputFields
	context: WibeContext<any>
	id?: string
	where?: any
	typeOfExecution?: TypeOfExecution
}) => {
	const entries = Object.entries(fields)

	return entries.reduce(
		async (acc, [fieldName, value]) => {
			const newAcc = await acc

			if (typeof value === 'object' && value?.createAndLink) {
				newAcc[fieldName] = await createAndLink({
					createAndLink: value.createAndLink,
					fieldName,
					context,
					className,
				})
			} else if (typeof value === 'object' && value?.link) {
				newAcc[fieldName] = value.link
			} else if (typeof value === 'object' && value?.createAndAdd) {
				newAcc[fieldName] = await createAndAdd({
					createAndAdd: value.createAndAdd,
					fieldName,
					context,
					className,
				})
			} else if (typeof value === 'object' && value?.add) {
				const addValue = await add({
					add: value.add,
					context,
					fieldName,
					typeOfExecution: typeOfExecution || 'create',
					id,
					className,
					where,
				})

				if (addValue) newAcc[fieldName] = addValue
			} else if (typeof value === 'object' && value?.remove) {
				const removeValue = await remove({
					remove: value.remove,
					context,
					fieldName,
					typeOfExecution: typeOfExecution || 'create',
					id,
					className,
					where,
				})

				if (removeValue) newAcc[fieldName] = removeValue
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
	context: WibeContext<any>,
	info: GraphQLResolveInfo,
	className: keyof WibeAppTypes['types'],
) => {
	const fields = getFieldsFromInfo(info, className)

	return context.wibeApp.databaseController.getObject({
		className,
		id,
		fields,
		context,
	})
}

export const queryForMultipleObject = async (
	_: any,
	{ where, offset, first }: any,
	context: WibeContext<any>,
	info: GraphQLResolveInfo,
	className: keyof WibeAppTypes['types'],
) => {
	const fields = getFieldsFromInfo(info, className)

	const objects = await context.wibeApp.databaseController.getObjects({
		className,
		where,
		fields,
		offset,
		first,
		context,
	})

	return {
		count: fields.includes('count')
			? await context.wibeApp.databaseController.count({
					className,
					where,
					context,
				})
			: undefined,
		edges: objects.map((object: any) => ({
			node: object,
		})),
	}
}

export const mutationToCreateObject = async (
	_: any,
	args: any,
	context: WibeContext<any>,
	info: GraphQLResolveInfo,
	className: keyof WibeAppTypes['types'],
) => {
	const fields = getFieldsFromInfo(info, className)

	const updatedFieldsToCreate = await executeRelationOnFields({
		className,
		fields: args.input?.fields,
		context,
	})

	return {
		[firstLetterInLowerCase(className)]:
			await context.wibeApp.databaseController.createObject({
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
	context: WibeContext<any>,
	info: GraphQLResolveInfo,
	className: keyof WibeAppTypes['types'],
) => {
	const fields = getFieldsFromInfo(info, className)
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

	const objects = await context.wibeApp.databaseController.createObjects({
		className,
		data: updatedFieldsToCreate,
		fields,
		offset: args.input?.offset,
		first: args.input?.first,
		context,
	})

	return {
		edges: objects.map((object: any) => ({ node: object })),
	}
}

export const mutationToUpdateObject = async (
	_: any,
	args: any,
	context: WibeContext<any>,
	info: GraphQLResolveInfo,
	className: keyof WibeAppTypes['types'],
) => {
	const fields = getFieldsFromInfo(info, className)

	const updatedFields = await executeRelationOnFields({
		className,
		fields: args.input?.fields,
		context,
		id: args.input?.id,
		typeOfExecution: 'update',
	})

	return {
		[firstLetterInLowerCase(className)]:
			await context.wibeApp.databaseController.updateObject({
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
	context: WibeContext<any>,
	info: GraphQLResolveInfo,
	className: keyof WibeAppTypes['types'],
) => {
	const fields = getFieldsFromInfo(info, className)

	const updatedFields = await executeRelationOnFields({
		className,
		fields: args.input?.fields,
		context,
		typeOfExecution: 'updateMany',
		where: args.input?.where,
	})

	const objects = await context.wibeApp.databaseController.updateObjects({
		className,
		where: args.input?.where,
		data: updatedFields,
		fields,
		offset: args.input?.offset,
		first: args.input?.first,
		context,
	})

	return {
		edges: objects.map((object: any) => ({ node: object })),
	}
}

export const mutationToDeleteObject = async (
	_: any,
	args: any,
	context: WibeContext<any>,
	info: GraphQLResolveInfo,
	className: keyof WibeAppTypes['types'],
) => {
	const fields = getFieldsFromInfo(info, className)

	return {
		[firstLetterInLowerCase(className)]:
			await context.wibeApp.databaseController.deleteObject({
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
	context: WibeContext<any>,
	info: GraphQLResolveInfo,
	className: keyof WibeAppTypes['types'],
) => {
	const fields = getFieldsFromInfo(info, className)

	const objects = await context.wibeApp.databaseController.deleteObjects({
		className,
		where: args.input?.where,
		fields,
		offset: args.input?.offset,
		first: args.input?.first,
		context,
	})

	return {
		edges: objects.map((object: any) => ({ node: object })),
	}
}
