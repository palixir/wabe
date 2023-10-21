import { GraphQLResolveInfo } from 'graphql'

// TODO : For the moment this function only get the first level of fields
export const getFieldsFromInfo = (info: GraphQLResolveInfo) =>
	info.fieldNodes[0].selectionSet?.selections.map(
		// @ts-ignore
		(selection) => selection.name.value,
	)
