import { WibeApp } from '../..'
import { Context } from './interface'

type CreateAndLink = any
type Link = string
type Add = Array<string>
type Remove = Array<string>
type CreateAndAdd = Array<any>

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
	const classInSchema = WibeApp.config.schema.class.find(
		(schemaClass) => schemaClass.name === className,
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
	const classInSchema = WibeApp.config.schema.class.find(
		(schemaClass) => schemaClass.name === className,
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
	typeOfExecution: 'create' | 'update' | 'updateMany'
	id?: string
	className: string
	where: any
}) => {
	if (typeOfExecution === 'create') return add

	// If update we get the current value and add the new value (we need to concat)
	if (typeOfExecution === 'update' && id) {
		const classInSchema = WibeApp.config.schema.class.find(
			(classItem) => classItem.name === className,
		)

		if (!classInSchema) throw new Error('Class not found in schema')

		const fieldInClass = classInSchema?.fields[fieldName]

		const currentValue = await WibeApp.databaseController.getObject({
			// @ts-expect-error
			className: fieldInClass.class,
			id,
			fields: [fieldName],
		})

		return [...(currentValue?.[fieldName] || []), ...add]
	}

	// For update many we need to get all objects that match the where and add the new value
	// So we doesn't update the field for updateMany
	if (typeOfExecution === 'updateMany' && where) {
		const classInSchema = WibeApp.config.schema.class.find(
			(classItem) => classItem.name === className,
		)

		if (!classInSchema) throw new Error('Class not found in schema')

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
	typeOfExecution: 'create' | 'update' | 'updateMany'
	id?: string
	className: string
	where: any
}) => {
	if (typeOfExecution === 'create') return []

	if (typeOfExecution === 'update' && id) {
		const classInSchema = WibeApp.config.schema.class.find(
			(classItem) => classItem.name === className,
		)

		if (!classInSchema) throw new Error('Class not found in schema')

		const fieldInClass = classInSchema?.fields[fieldName]

		const currentValue = await WibeApp.databaseController.getObject({
			// @ts-expect-error
			className: fieldInClass.class,
			id,
			fields: [fieldName],
		})

		const olderValue = currentValue?.[fieldName] || []

		return olderValue.filter((olderVal: any) => !remove.includes(olderVal))
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
				const currentValue = object[fieldName]

				const olderValue = currentValue?.[fieldName] || []

				await WibeApp.databaseController.updateObject({
					// @ts-expect-error
					className,
					id: object.id,
					// @ts-expect-error
					data: {
						[fieldName]: olderValue.filter(
							(olderVal: any) => !remove.includes(olderVal),
						),
					},
					context,
				})
			}),
		)
	}
}
