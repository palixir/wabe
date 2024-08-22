import { getClassFromClassName } from '../utils'
import type { WabeContext } from '../server/interface'

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
	context: WabeContext<any>
	className: string
}) => {
	const classInSchema = getClassFromClassName(
		className,
		context.wabeApp.config,
	)

	const { id } = await context.wabeApp.databaseController.createObject({
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
	context: WabeContext<any>
	className: string
}) => {
	const classInSchema = getClassFromClassName(
		className,
		context.wabeApp.config,
	)

	const result = await context.wabeApp.databaseController.createObjects({
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
	context: WabeContext<any>
	typeOfExecution: TypeOfExecution
	id?: string
	className: string
	where: any
}) => {
	if (typeOfExecution === 'create') return add

	const classInSchema = getClassFromClassName(
		className,
		context.wabeApp.config,
	)

	const fieldInClass = classInSchema.fields[fieldName]

	if (typeOfExecution === 'update' && id) {
		const currentValue = await context.wabeApp.databaseController.getObject(
			{
				className,
				id,
				fields: [fieldName],
				context,
			},
		)

		return [...(currentValue[fieldName] || []), ...add]
	}

	// For update many we need to get all objects that match the where and add the new value
	// So we doesn't update the field for updateMany
	if (typeOfExecution === 'updateMany' && where) {
		const allObjectsMatchedWithWhere =
			await context.wabeApp.databaseController.getObjects({
				// @ts-expect-error
				className: fieldInClass.class,
				where,
				fields: [fieldName],
				context,
			})

		await Promise.all(
			allObjectsMatchedWithWhere.map(async (object: any) => {
				const currentValue = object[fieldName]

				return context.wabeApp.databaseController.updateObject({
					// @ts-expect-error
					className: classInSchema.fields[fieldName].class,
					id: object.id,
					data: {
						[fieldName]: [...(currentValue || []), ...add],
					},
					context,
					fields: [],
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
	context: WabeContext<any>
	typeOfExecution: TypeOfExecution
	id?: string
	className: string
	where: any
}) => {
	if (typeOfExecution === 'create') return []

	if (typeOfExecution === 'update' && id) {
		const currentValue = await context.wabeApp.databaseController.getObject(
			{
				className,
				id,
				fields: [fieldName],
				context,
			},
		)

		const olderValues = currentValue[fieldName] || []

		return olderValues.filter(
			(olderValue: any) => !remove.includes(olderValue),
		)
	}

	if (typeOfExecution === 'updateMany' && where) {
		const allObjectsMatchedWithWhere =
			await context.wabeApp.databaseController.getObjects({
				className,
				where,
				fields: ['id'],
				context,
			})

		await Promise.all(
			allObjectsMatchedWithWhere.map(async (object: any) => {
				const olderValues = object[fieldName]?.[fieldName] || []

				return context.wabeApp.databaseController.updateObject({
					className,
					id: object.id,
					data: {
						[fieldName]: olderValues.filter(
							(olderValue: any) => !remove.includes(olderValue),
						),
					},
					context,
					fields: [],
				})
			}),
		)
	}
}
