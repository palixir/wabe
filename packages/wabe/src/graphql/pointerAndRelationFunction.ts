import { getClassFromClassName } from '../utils'
import type { WabeContext } from '../server/interface'
import { notEmpty } from '../utils/export'

type CreateAndLink = any
type Link = string
type Unlink = boolean
type Add = Array<string>
type Remove = Array<string>
type CreateAndAdd = Array<any>

export type TypeOfExecution = 'create' | 'update' | 'updateMany'

export type InputFields = Record<
	string,
	| {
			createAndLink?: CreateAndLink
			link?: Link
			unlink?: Unlink
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
	const classInSchema = getClassFromClassName(className, context.wabe.config)

	const res = await context.wabe.controllers.database.createObject({
		// @ts-expect-error
		className: classInSchema.fields[fieldName].class,
		data: createAndLink,
		select: { id: true },
		context,
	})

	return res?.id
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
	const classInSchema = getClassFromClassName(className, context.wabe.config)

	const result = await context.wabe.controllers.database.createObjects({
		// @ts-expect-error
		className: classInSchema.fields[fieldName].class,
		data: createAndAdd,
		select: { id: true },
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

	if (typeOfExecution === 'update' && id) {
		const currentValue = await context.wabe.controllers.database.getObject({
			className,
			id,
			select: { [fieldName]: true },
			context,
		})

		const currentValueIds = currentValue?.[fieldName]?.map((object: any) => object.id) || []

		return [...currentValueIds, ...add].filter(notEmpty)
	}

	// For update many we need to get all objects that match the where and add the new value
	// So we doesn't update the field for updateMany
	if (typeOfExecution === 'updateMany' && where) {
		const allObjectsMatchedWithWhere = await context.wabe.controllers.database.getObjects({
			className,
			where,
			select: { [fieldName]: true },
			context,
		})

		return Promise.all(
			allObjectsMatchedWithWhere.flatMap((object: any) => {
				const currentValueIds = object[fieldName]?.map((object: any) => object.id) || []

				return [...currentValueIds, ...add]
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

	const classInSchema = getClassFromClassName(className, context.wabe.config)

	if (typeOfExecution === 'update' && id) {
		const currentValue = await context.wabe.controllers.database.getObject({
			className,
			id,
			select: { [fieldName]: true },
			context,
		})

		const olderValuesIds = currentValue?.[fieldName]?.map((object: any) => object.id) || []

		await context.wabe.controllers.database.deleteObjects({
			// @ts-expect-error
			className: classInSchema.fields[fieldName].class,
			where: { id: { in: remove } },
			context,
			select: {},
		})

		return olderValuesIds.filter((olderValue: any) => !remove.includes(olderValue))
	}

	if (typeOfExecution === 'updateMany' && where) {
		const allObjectsMatchedWithWhere = await context.wabe.controllers.database.getObjects({
			className,
			where,
			select: { [fieldName]: true },
			context,
		})

		const olderValuesIds = allObjectsMatchedWithWhere.flatMap(
			(object: any) => object[fieldName]?.map((object: any) => object.id) || [],
		)

		await context.wabe.controllers.database.deleteObjects({
			// @ts-expect-error
			className: classInSchema.fields[fieldName].class,
			where: { id: { in: remove } },
			context,
			select: {},
		})

		return olderValuesIds.filter((olderValue: any) => !remove.includes(olderValue))
	}
}
