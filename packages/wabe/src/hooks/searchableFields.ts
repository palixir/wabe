import { tokenize } from '../utils'
import { notEmpty } from '../utils/export'
import type { HookObject } from './HookObject'

export const stringExtraction = (value: any): Array<string> => {
	if (value === undefined || value === null) return []

	if (typeof value === 'object')
		return Object.values(value).flatMap((v) => stringExtraction(v))

	if (typeof value === 'string')
		return tokenize(value)
			.trim()
			.split(' ')
			.map((word: string) => word.trim())
			.flatMap((word: string) => {
				const arrayOfString = []

				for (let i = 1; i <= word.length; i += 1)
					arrayOfString.push(word.substring(0, i).toLowerCase())

				return arrayOfString
			})

	if (typeof value === 'number') return [String(value)]

	return []
}

export const defaultSearchableFieldsBeforeCreate = (
	object: HookObject<any, any>,
) => {
	const searchablesFields = object.context.wabe.config.schema?.classes?.find(
		(currentClass) => currentClass.name === object.className,
	)?.searchableFields

	if (!searchablesFields || searchablesFields.length === 0) return

	const newData = object.getNewData()

	const extractedSearchField = Object.entries(newData)
		.flatMap(([key, value]) => {
			if (!searchablesFields.includes(key)) return undefined

			return stringExtraction(value)
		})
		.filter(notEmpty)

	object.upsertNewData('search', extractedSearchField)
}

export const defaultSearchableFieldsBeforeUpdate = (
	object: HookObject<any, any>,
) => {
	const searchablesFields = object.context.wabe.config.schema?.classes?.find(
		(currentClass) => currentClass.name === object.className,
	)?.searchableFields

	if (!searchablesFields || searchablesFields.length === 0) return

	const newData = object.getNewData()

	const newExtractedSearchField = Object.entries(newData)
		.flatMap(([key, value]) => {
			if (!searchablesFields.includes(key)) return undefined

			return stringExtraction(value)
		})
		.filter(notEmpty)

	const oldExtractedSearcFieldForUpdateFields = Object.entries(
		object.object || {},
	)
		.flatMap(([key, value]) => {
			// If the data is not a searchable field or don't change
			if (
				!searchablesFields.includes(key) ||
				!Object.keys(newData).includes(key)
			)
				return undefined

			return stringExtraction(value)
		})
		.filter(notEmpty)

	const actualSearch = (object.object?.search || []) as string[]

	// Actual search fields minus old search data for same field + new extracted data for the field
	const extractedSearchFields = [
		...actualSearch.filter(
			(element: string) =>
				!oldExtractedSearcFieldForUpdateFields.includes(element),
		),
		...newExtractedSearchField,
	]

	object.upsertNewData('search', extractedSearchFields)
}
