import { GraphQLResolveInfo } from 'graphql'
import { WibeApp } from '../..'
import { WibeSchemaTypes } from '../../../generated/wibe'
import { Context } from '../interface'

const getFieldsFromInfo = (info: GraphQLResolveInfo) => {
	const firstNode = info.fieldNodes[0]

	const edgesNode = firstNode.selectionSet?.selections.find(
		// @ts-expect-error
		(selection) => selection.name.value === 'edges',
	)

	if (edgesNode) {
		// @ts-expect-error
		return firstNode.selectionSet?.selections[0].selectionSet?.selections[0].selectionSet.selections.map(
			// @ts-expect-error
			(selection) => selection.name.value,
		)
	}

	return firstNode.selectionSet?.selections.map(
		// @ts-expect-error
		(selection) => selection.name.value,
	)
}

export const queryForOneObject = (
	_: any,
	{ id }: any,
	__: any,
	info: GraphQLResolveInfo,
	className: keyof WibeSchemaTypes,
) => {
	const fields = getFieldsFromInfo(info)

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
	const fields = getFieldsFromInfo(info)

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

export const mutationToCreateObject = (
	_: any,
	args: any,
	context: Context,
	info: GraphQLResolveInfo,
	className: keyof WibeSchemaTypes,
) => {
	const fields = getFieldsFromInfo(info)

	if (!fields) throw new Error('No fields provided')

	return WibeApp.databaseController.createObject({
		className,
		data: args.input?.fields,
		fields,
		context,
	})
}

export const mutationToCreateMultipleObjects = async (
	_: any,
	args: any,
	context: Context,
	info: GraphQLResolveInfo,
	className: keyof WibeSchemaTypes,
) => {
	const fields = getFieldsFromInfo(info)

	if (!fields) throw new Error('No fields provided')

	const objects = await WibeApp.databaseController.createObjects({
		className,
		data: args.input?.fields,
		fields,
		offset: args.input?.offset,
		limit: args.input?.limit,
		context,
	})

	return {
		edges: objects.map((object: any) => ({ node: object })),
	}
}

export const mutationToUpdateObject = (
	_: any,
	args: any,
	context: Context,
	info: GraphQLResolveInfo,
	className: keyof WibeSchemaTypes,
) => {
	const fields = getFieldsFromInfo(info)

	if (!fields) throw new Error('No fields provided')

	return WibeApp.databaseController.updateObject({
		className,
		id: args.input?.id,
		data: args.input?.fields,
		fields,
		context,
	})
}

export const mutationToUpdateMultipleObjects = async (
	_: any,
	args: any,
	context: Context,
	info: GraphQLResolveInfo,
	className: keyof WibeSchemaTypes,
) => {
	const fields = getFieldsFromInfo(info)

	if (!fields) throw new Error('No fields provided')

	const objects = await WibeApp.databaseController.updateObjects({
		className,
		where: args.input?.where,
		data: args.input?.fields,
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
	const fields = getFieldsFromInfo(info)

	if (!fields) throw new Error('No fields provided')

	return WibeApp.databaseController.deleteObject({
		className,
		id: args.input?.id,
		fields,
		context,
	})
}

export const mutationToDeleteMultipleObjects = async (
	_: any,
	args: any,
	context: Context,
	info: GraphQLResolveInfo,
	className: keyof WibeSchemaTypes,
) => {
	const fields = getFieldsFromInfo(info)

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
