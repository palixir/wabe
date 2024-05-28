import { WibeApp } from '../..'
import { getClassFromClassName } from '../utils'
import type { Context } from './interface'

type CreateAndLink = any
type Link = string
type Add = Array<string>
type Remove = Array<string>
type CreateAndAdd = Array<any>

export type TypeOfExecution = 'create' | 'update' | 'updateMany'

export type InputFields = Record<
	string,
	| {
			createAndLink?: CreateAndLink
			link?: Link
			add?: Add
			remove?: Remove
			createAndAdd?: CreateAndAdd
	  }
	| string
>

export const createAndLink = async ({
	createAndLink,
	context,
	fieldName,
	className,
}: {
	createAndLink: CreateAndLink
	fieldName: string
	context: Context
	className: string
}) => {
	const classInSchema = getClassFromClassName(className)

	const { id } = await WibeApp.databaseController.createObject({
		// @ts-expect-error
		className: classInSchema.fields[fieldName].class,
		data: createAndLink,
		fields: ['id'],
		context,
	})

	return id
}

export const createAndAdd = async ({
	createAndAdd,
	context,
	fieldName,
	className,
}: {
	createAndAdd: CreateAndAdd
	fieldName: string
	context: Context
	className: string
}) => {
	const classInSchema = getClassFromClassName(className)

	const result = await WibeApp.databaseController.createObjects({
		// @ts-expect-error
		className: classInSchema.fields[fieldName].class,
		data: createAndAdd,
		fields: ['id'],
		context,
	})

	return result.map((object: any) => object.id)
}

export const add = async ({
	add,
	context,
	fieldName,
	typeOfExecution,
	id,
	className,
	where,
}: {
	add: Add
	fieldName: string
	context: Context
	typeOfExecution: TypeOfExecution
	id?: string
	className: string
	where: any
}) => {
	if (typeOfExecution === 'create') return add

	const classInSchema = getClassFromClassName(className)

	const fieldInClass = classInSchema.fields[fieldName]

	if (typeOfExecution === 'update' && id) {
		const currentValue = await WibeApp.databaseController.getObject({
			// @ts-expect-error
			className: fieldInClass.class,
			id,
			fields: [fieldName],
		})

		if (!currentValue) return [...add]

		return [...currentValue[fieldName], ...add]
	}

	// For update many we need to get all objects that match the where and add the new value
	// So we doesn't update the field for updateMany
	if (typeOfExecution === 'updateMany' && where) {
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

				return WibeApp.databaseController.updateObject({
					// @ts-expect-error
					className: classInSchema.fields[fieldName].class,
					id: object.id,
					data: {
						[fieldName]: [...(currentValue || []), ...add],
					},
					context,
				})
			}),
		)
	}
}

export const remove = async ({
	remove,
	context,
	fieldName,
	typeOfExecution,
	id,
	className,
	where,
}: {
	remove: Remove
	fieldName: string
	context: Context
	typeOfExecution: TypeOfExecution
	id?: string
	className: string
	where: any
}) => {
	if (typeOfExecution === 'create') return []

	if (typeOfExecution === 'update' && id) {
		const classInSchema = getClassFromClassName(className)

		const fieldInClass = classInSchema.fields[fieldName]

		const currentValue = await WibeApp.databaseController.getObject({
			// @ts-expect-error
			className: fieldInClass.class,
			id,
			fields: [fieldName],
		})

		const olderValues = currentValue?.[fieldName] || []

		return olderValues.filter(
			(olderValue: any) => !remove.includes(olderValue),
		)
	}

	if (typeOfExecution === 'updateMany' && where) {
		const allObjectsMatchedWithWhere =
			await WibeApp.databaseController.getObjects({
				// @ts-expect-error
				className,
				where,
				fields: ['id'],
			})

		await Promise.all(
			allObjectsMatchedWithWhere.map(async (object: any) => {
				const olderValues = object[fieldName]?.[fieldName] || []

				return WibeApp.databaseController.updateObject({
					// @ts-expect-error
					className,
					id: object.id,
					// @ts-expect-error
					data: {
						[fieldName]: olderValues.filter(
							(olderValue: any) => !remove.includes(olderValue),
						),
					},
					context,
				})
			}),
		)
	}
}
