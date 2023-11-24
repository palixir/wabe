import { GraphQLResolveInfo } from 'graphql'
import { getFieldsFromInfo } from '../graphql/resolvers'
import { WibeApp } from '../server'

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
	__: any,
	___: any,
	info: GraphQLResolveInfo,
	className: string,
) => {
	const fields = getFieldsFromInfo(info)

	if (!fields) throw new Error('No fields provided')

	return WibeApp.databaseController.getObjects<any>({
		className,
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
) => {}
