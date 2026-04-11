import { getClassFromClassName } from '../utils'
import type { WabeContext } from '../server/interface'
import { notEmpty } from '../utils/export'

type CreateAndLink = any
type Link = string
type Unlink = boolean
type Add = Array<string>
type Remove = Array<string>
type CreateAndAdd = Array<any>

export type PointerObject = {
	class: string
	id: string
	type: 'Pointer'
}

const toPointerObject = ({ className, id }: { className: string; id: string }): PointerObject => ({
	class: className,
	id,
	type: 'Pointer',
})

export const getPointerId = (value: unknown): string | undefined => {
	if (typeof value === 'string') return value
	if (!value || typeof value !== 'object') return undefined

	const id = (value as { id?: string }).id
	return typeof id === 'string' ? id : undefined
}

const getTargetClassFromField = ({
	className,
	fieldName,
	context,
}: {
	className: string
	fieldName: string
	context: WabeContext<any>
}) => {
	const classInSchema = getClassFromClassName(className, context.wabe.config)
	// @ts-expect-error schema runtime
	const targetClass = classInSchema.fields[fieldName]?.class

	if (!targetClass || typeof targetClass !== 'string')
		throw new Error(`Target class not found for ${className}.${fieldName}`)

	return targetClass
}

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
	const targetClass = getTargetClassFromField({
		className,
		fieldName,
		context,
	})

	const res = await context.wabe.controllers.database.createObject({
		className: targetClass,
		data: createAndLink,
		select: { id: true },
		context,
	})

	if (!res?.id) throw new Error('Linked object not created')

	return toPointerObject({
		className: targetClass,
		id: res.id,
	})
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
	const targetClass = getTargetClassFromField({
		className,
		fieldName,
		context,
	})

	const result = await context.wabe.controllers.database.createObjects({
		className: targetClass,
		data: createAndAdd,
		select: { id: true },
		context,
	})

	return result
		.map((object: any) =>
			object?.id
				? toPointerObject({
						className: targetClass,
						id: object.id,
					})
				: undefined,
		)
		.filter(notEmpty)
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
	const targetClass = getTargetClassFromField({
		className,
		fieldName,
		context,
	})
	const idsToAdd = add.map(getPointerId).filter(notEmpty)

	if (typeOfExecution === 'create') {
		const linkedObjects = await Promise.all(
			idsToAdd.map((id) =>
				context.wabe.controllers.database.getObject({
					className: targetClass,
					id,
					select: { id: true },
					context,
				}),
			),
		)
		if (linkedObjects.some((object) => !object)) throw new Error('Object not found')

		return idsToAdd.map((id) =>
			toPointerObject({
				className: targetClass,
				id,
			}),
		)
	}

	if (typeOfExecution === 'update' && id) {
		const currentValue = await context.wabe.controllers.database.getObject({
			className,
			id,
			select: { [fieldName]: true },
			context,
		})

		const currentValueIds =
			currentValue?.[fieldName]?.map((object: any) => getPointerId(object)).filter(notEmpty) || []

		return [...currentValueIds, ...idsToAdd].filter(notEmpty).map((id) =>
			toPointerObject({
				className: targetClass,
				id,
			}),
		)
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
				const currentValueIds =
					object[fieldName]?.map((object: any) => getPointerId(object)).filter(notEmpty) || []

				return [...currentValueIds, ...idsToAdd].map((id) =>
					toPointerObject({
						className: targetClass,
						id,
					}),
				)
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

	const targetClass = getTargetClassFromField({
		className,
		fieldName,
		context,
	})
	const idsToRemove = remove.map(getPointerId).filter(notEmpty)

	if (typeOfExecution === 'update' && id) {
		const currentValue = await context.wabe.controllers.database.getObject({
			className,
			id,
			select: { [fieldName]: true },
			context,
		})

		const olderValuesIds =
			currentValue?.[fieldName]?.map((object: any) => getPointerId(object)).filter(notEmpty) || []

		return olderValuesIds
			.filter((olderValue: any) => !idsToRemove.includes(olderValue))
			.map((pointerId: string) =>
				toPointerObject({
					className: targetClass,
					id: pointerId,
				}),
			)
	}

	if (typeOfExecution === 'updateMany' && where) {
		const allObjectsMatchedWithWhere = await context.wabe.controllers.database.getObjects({
			className,
			where,
			select: { [fieldName]: true },
			context,
		})

		const olderValuesIds = allObjectsMatchedWithWhere.flatMap((object: any) =>
			object[fieldName]?.map((object: any) => getPointerId(object)).filter(notEmpty),
		)

		return olderValuesIds
			.filter(notEmpty)
			.filter((olderValue: any) => !idsToRemove.includes(olderValue))
			.map((pointerId: string) =>
				toPointerObject({
					className: targetClass,
					id: pointerId,
				}),
			)
	}
}
