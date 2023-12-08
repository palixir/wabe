import { GraphQLResolveInfo } from 'graphql'
import { WibeApp } from '..'

const getFieldsFromInfo = (info: GraphQLResolveInfo) =>
	info.fieldNodes[0].selectionSet?.selections.map(
		// @ts-expect-error
		(selection) => selection.name.value,
	)

export const queryForOneObject = (
	_: any,
	{ id }: any,
	__: any,
	info: GraphQLResolveInfo,
	className: string,
) => {
	const fields = getFieldsFromInfo(info)

	if (!fields) throw new Error('No fields provided')

	return WibeApp.databaseController.getObject<any>({
		className,
		id,
		fields,
	})
}

export const queryForMultipleObject = (
	_: any,
	args: any,
	___: any,
	info: GraphQLResolveInfo,
	className: string,
) => {
	const fields = getFieldsFromInfo(info)

	if (!fields) throw new Error('No fields provided')

	return WibeApp.databaseController.getObjects<any>({
		className,
		where: args.where,
		fields,
	})
}

export const mutationToCreateObject = (
	_: any,
	args: any,
	___: any,
	info: GraphQLResolveInfo,
	className: string,
) => {
	const fields = getFieldsFromInfo(info)

	if (!fields) throw new Error('No fields provided')

	return WibeApp.databaseController.createObject<any>({
		className,
		data: args.input,
		fields,
	})
}

export const mutationToCreateMultipleObjects = (
	_: any,
	args: any,
	___: any,
	info: GraphQLResolveInfo,
	className: string,
) => {
	const fields = getFieldsFromInfo(info)

	if (!fields) throw new Error('No fields provided')

	return WibeApp.databaseController.createObjects<any>({
		className,
		data: args.input,
		fields,
	})
}

export const mutationToUpdateObject = (
	_: any,
	args: any,
	___: any,
	info: GraphQLResolveInfo,
	className: string,
) => {
	const fields = getFieldsFromInfo(info)

	if (!fields) throw new Error('No fields provided')

	return WibeApp.databaseController.updateObject<any>({
		className,
		id: args.input.id,
		data: args.input.fields,
		fields,
	})
}

export const mutationToUpdateMultipleObjects = (
	_: any,
	args: any,
	___: any,
	info: GraphQLResolveInfo,
	className: string,
) => {
	const fields = getFieldsFromInfo(info)

	if (!fields) throw new Error('No fields provided')

	return WibeApp.databaseController.updateObjects<any>({
		className,
		where: args.input.where,
		data: args.input.fields,
		fields,
	})
}

export const mutationToDeleteObject = (
	_: any,
	args: any,
	___: any,
	info: GraphQLResolveInfo,
	className: string,
) => {
	const fields = getFieldsFromInfo(info)

	if (!fields) throw new Error('No fields provided')

	return WibeApp.databaseController.deleteObject<any>({
		className,
		id: args.input.id,
		fields,
	})
}

export const mutationToDeleteMultipleObjects = (
	_: any,
	args: any,
	___: any,
	info: GraphQLResolveInfo,
	className: string,
) => {
	const fields = getFieldsFromInfo(info)

	if (!fields) throw new Error('No fields provided')

	return WibeApp.databaseController.deleteObjects<any>({
		className,
		where: args.input.where,
		fields,
	})
}
