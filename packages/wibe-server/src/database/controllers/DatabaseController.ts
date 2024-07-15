import type { WibeAppTypes } from '../..'
import { OperationType, initializeHook } from '../../hooks'
import type { WibeContext } from '../../server/interface'
import { notEmpty } from '../../utils/helper'
import type {
	CreateObjectOptions,
	CreateObjectsOptions,
	DatabaseAdapter,
	DeleteObjectOptions,
	DeleteObjectsOptions,
	GetObjectOptions,
	GetObjectsOptions,
	OutputType,
	UpdateObjectOptions,
	UpdateObjectsOptions,
	WhereType,
} from '../adapters/adaptersInterface'

type PointerObject = Record<
	string,
	{
		pointerClass?: string
		fieldsOfPointerClass: Array<string>
	}
>

interface PointerFields {
	pointersFieldsId: string[]
	pointers: PointerObject
}

export class DatabaseController<T extends WibeAppTypes> {
	public adapter: DatabaseAdapter

	constructor(adapter: DatabaseAdapter) {
		this.adapter = adapter
	}

	async connect() {
		return this.adapter.connect()
	}

	async close() {
		return this.adapter.close()
	}

	async createClassIfNotExist(className: string) {
		return this.adapter.createClassIfNotExist(className)
	}

	_getPointerObject(
		className: keyof T['types'],
		fields: string[],
		context: WibeContext<T>,
	): PointerFields {
		const realClass = context.wibe.config.schema.classes.find(
			// @ts-expect-error
			(c) => c.name.toLowerCase() === className.toLowerCase(),
		)

		if (!realClass) throw new Error('Class not found in schema')

		return fields.reduce(
			(acc, field) => {
				const splittedField = field.split('.')
				if (splittedField.length === 1) return acc

				const pointerField = splittedField[0]

				// @ts-expect-error
				const pointerClass = realClass.fields[pointerField].class

				const pointerFields = splittedField.slice(1).join('.')

				return {
					pointers: {
						...acc.pointers,
						[pointerField]: {
							...(acc.pointers?.[pointerField] || []),
							pointerClass,
							fieldsOfPointerClass: [
								...(acc.pointers?.[pointerField]
									?.fieldsOfPointerClass || []),
								pointerFields,
							],
						},
					},
					pointersFieldsId: acc.pointersFieldsId?.includes(
						pointerField,
					)
						? acc.pointersFieldsId
						: [...(acc.pointersFieldsId || []), pointerField],
				}
			},
			{ pointers: {} } as PointerFields,
		)
	}

	_isRelationField<U extends keyof T['types']>(
		originClassName: U,
		context: WibeContext<T>,
		pointerClassName?: string,
	) {
		if (!pointerClassName) return false

		return context.wibe.config.schema.classes.some(
			(c) =>
				// @ts-expect-error
				c.name.toLowerCase() === originClassName.toLowerCase() &&
				Object.values(c.fields).find(
					(field) =>
						field.type === 'Relation' &&
						// @ts-expect-error
						field.class.toLowerCase() ===
							pointerClassName.toLowerCase(),
				),
		)
	}

	_isPointerField<U extends keyof T['types']>(
		originClassName: U,
		context: WibeContext<T>,
		pointerClassName?: string,
	) {
		if (!pointerClassName) return false

		return context.wibe.config.schema.classes.some(
			(c) =>
				// @ts-expect-error
				c.name.toLowerCase() === originClassName.toLowerCase() &&
				Object.values(c.fields).find(
					(field) =>
						field.type === 'Pointer' &&
						// @ts-expect-error
						field.class.toLowerCase() ===
							pointerClassName.toLowerCase(),
				),
		)
	}

	async _getFinalObjectWithPointer<
		U extends keyof T['types'],
		K extends keyof T['types'][U],
	>(
		objectData: OutputType<U, K> | null,
		pointersObject: PointerObject,
		originClassName: U,
		context: WibeContext<T>,
	): Promise<Record<any, any>> {
		return Object.entries(pointersObject).reduce(
			async (
				accPromise,
				[pointerField, { fieldsOfPointerClass, pointerClass }],
			) => {
				const acc = await accPromise

				const isPointer = this._isPointerField(
					originClassName,
					context,
					pointerClass,
				)

				if (isPointer && pointerClass) {
					const pointerObject = await this.getObject({
						className: pointerClass,
						fields: fieldsOfPointerClass,
						// @ts-expect-error
						id: objectData[pointerField],
						context,
					})

					return {
						...acc,
						[pointerField]: pointerObject,
					}
				}

				const isRelation = this._isRelationField(
					originClassName,
					context,
					pointerClass,
				)

				if (isRelation && pointerClass) {
					const relationObjects = await this.getObjects({
						className: pointerClass,
						fields: fieldsOfPointerClass,
						// @ts-expect-error
						where: { id: { in: objectData[pointerField] } },
						context,
					})

					return {
						...acc,
						[pointerField]: {
							edges: relationObjects.map((object: any) => ({
								node: object,
							})),
						},
					}
				}

				return acc
			},
			Promise.resolve({
				...objectData,
			} as Record<any, any>),
		)
	}

	async _getWhereObjectWithPointerOrRelation<
		U extends keyof T['types'],
		K extends keyof T['types'][U],
	>(className: U, where: WhereType<U, K>, context: WibeContext<T>) {
		const whereKeys = Object.keys(where) as Array<keyof WhereType<U, K>>

		const realClass = context.wibe.config.schema.classes.find(
			// @ts-expect-error
			(c) => c.name.toLowerCase() === className.toLowerCase(),
		)

		const newWhereObject = await whereKeys.reduce(async (acc, whereKey) => {
			const currentAcc = await acc

			const typedWhereKey = whereKey as string

			const field = realClass?.fields[typedWhereKey]

			if (typedWhereKey === 'AND' || typedWhereKey === 'OR') {
				const newWhere = await Promise.all(
					(where[typedWhereKey] as any).map((whereObject: any) =>
						this._getWhereObjectWithPointerOrRelation(
							className,
							whereObject,
							context,
						),
					),
				)

				return {
					...currentAcc,
					[typedWhereKey]: newWhere,
				}
			}

			if (field?.type !== 'Pointer' && field?.type !== 'Relation')
				return acc

			// @ts-expect-error
			const fieldTargetClass = field.class

			const objects = await this.getObjects({
				className: fieldTargetClass,
				fields: ['id'],
				// @ts-expect-error
				where: where[typedWhereKey],
				context,
			})

			return {
				...acc,
				[typedWhereKey]: {
					in: objects.map((object) => object.id),
				},
			}
		}, Promise.resolve({}))

		return {
			...where,
			...newWhereObject,
		}
	}

	_buildWhereWithACL<
		U extends keyof T['types'],
		K extends keyof T['types'][U],
	>(
		where: WhereType<U, K>,
		context: WibeContext<T>,
		operation: 'write' | 'read',
	): WhereType<U, K> {
		if (context.isRoot) return where

		const roleId = context.user?.role?.id
		const userId = context.user?.id

		// If we have an user we good right we return
		// If we don't have user we check role
		// If the role is good we return

		return {
			// @ts-expect-error
			AND: [
				{ ...where },
				userId || roleId
					? {
							OR: [
								userId
									? {
											AND: [
												{
													acl: {
														users: {
															userId: {
																in: [userId],
															},
														},
													},
												},
												{
													acl: {
														users: {
															[operation]: {
																in: [true],
															},
														},
													},
												},
											],
										}
									: undefined,
								roleId
									? {
											AND: [
												{
													acl: {
														users: {
															userId: {
																notIn: [userId],
															},
														},
													},
												},
												{
													acl: {
														roles: {
															roleId: {
																in: [roleId],
															},
														},
													},
												},
												{
													acl: {
														roles: {
															[operation]: {
																in: [true],
															},
														},
													},
												},
											],
										}
									: undefined,
							].filter(notEmpty),
						}
					: undefined,
			].filter(notEmpty),
		}
	}

	async getObject<U extends keyof T['types'], K extends keyof T['types'][U]>(
		params: GetObjectOptions<U, K>,
	): Promise<OutputType<U, K>> {
		const fields = (params.fields || []) as string[]

		const { pointersFieldsId, pointers } = this._getPointerObject(
			params.className,
			fields,
			params.context,
		)

		const fieldsWithoutPointers = fields.filter(
			(field) => !field.includes('.'),
		)

		const hook = !params.skipHooks
			? initializeHook({
					className: params.className,
					context: params.context,
				})
			: undefined

		await hook?.runOnSingleObject({
			operationType: OperationType.BeforeRead,
			id: params.id,
		})

		const whereWithACLCondition = this._buildWhereWithACL(
			{},
			params.context,
			'read',
		)

		const object = await this.adapter.getObject({
			...params,
			// @ts-expect-error
			fields: [...fieldsWithoutPointers, ...(pointersFieldsId || [])],
			where: whereWithACLCondition,
		})

		await hook?.runOnSingleObject({
			operationType: OperationType.AfterRead,
			object,
		})

		return this._getFinalObjectWithPointer(
			object,
			pointers,
			params.className,
			params.context,
		) as any
	}

	async getObjects<U extends keyof T['types'], K extends keyof T['types'][U]>(
		params: GetObjectsOptions<U, K>,
	): Promise<OutputType<U, K>[]> {
		const fields = (params.fields || []) as string[]

		const { pointersFieldsId, pointers } = this._getPointerObject(
			params.className,
			fields,
			params.context,
		)

		const fieldsWithoutPointers = fields.filter(
			(field) => !field.includes('.'),
		)

		const where = await this._getWhereObjectWithPointerOrRelation(
			params.className,
			params.where || {},
			params.context,
		)

		const whereWithACLCondition = this._buildWhereWithACL(
			where,
			params.context,
			'read',
		)

		const hook = !params.skipHooks
			? initializeHook({
					className: params.className,
					context: params.context,
				})
			: undefined

		await hook?.runOnMultipleObjects({
			operationType: OperationType.BeforeRead,
			where: whereWithACLCondition,
		})

		const objects = await this.adapter.getObjects({
			...params,
			where: whereWithACLCondition,
			// @ts-expect-error
			fields: [...fieldsWithoutPointers, ...(pointersFieldsId || [])],
		})

		await hook?.runOnMultipleObjects({
			operationType: OperationType.AfterRead,
			objects,
		})

		return Promise.all(
			objects.map((object) =>
				this._getFinalObjectWithPointer(
					object,
					pointers,
					params.className,
					params.context,
				),
			),
		) as Promise<OutputType<U, K>[]>
	}

	async createObject<
		U extends keyof T['types'],
		K extends keyof T['types'][U],
		W extends keyof T['types'][U],
	>(params: CreateObjectOptions<U, K, W>) {
		const hook = initializeHook({
			className: params.className,
			context: params.context,
			newData: params.data,
		})

		const { newData } = await hook.runOnSingleObject({
			operationType: OperationType.BeforeCreate,
		})

		const object = await this.adapter.createObject({
			...params,
			data: newData,
		})

		await hook.runOnSingleObject({
			operationType: OperationType.AfterCreate,
			object,
		})

		const objectToReturn = await this.getObject({
			className: params.className,
			context: params.context,
			fields: params.fields,
			id: object.id,
			skipHooks: true,
		})

		return objectToReturn
	}

	async createObjects<
		U extends keyof T['types'],
		K extends keyof T['types'][U],
		W extends keyof T['types'][U],
	>(params: CreateObjectsOptions<U, K, W>) {
		if (params.data.length === 0) return []

		const hooks = await Promise.all(
			params.data.map((newData) =>
				initializeHook({
					className: params.className,
					context: params.context,
					newData,
				}),
			),
		)

		const arrayOfComputedData = await Promise.all(
			hooks.map(
				async (hook) =>
					(
						await hook.runOnMultipleObjects({
							operationType: OperationType.BeforeCreate,
						})
					).newData[0],
			),
		)

		const objects = await this.adapter.createObjects({
			...params,
			data: arrayOfComputedData,
		})

		const objectsId = objects.map((object) => object.id)

		await Promise.all(
			hooks.map((hook) =>
				hook.runOnMultipleObjects({
					operationType: OperationType.AfterCreate,
					objects,
				}),
			),
		)

		const objectsToReturn = await this.getObjects({
			className: params.className,
			context: params.context,
			fields: params.fields,
			// @ts-expect-error
			where: { id: { in: objectsId } },
			skipHooks: true,
		})

		return objectsToReturn
	}

	async updateObject<
		U extends keyof T['types'],
		K extends keyof T['types'][U],
		W extends keyof T['types'][U],
	>(params: UpdateObjectOptions<U, K, W>) {
		const hook = initializeHook({
			className: params.className,
			context: params.context,
			newData: params.data,
		})

		const { newData } = await hook.runOnSingleObject({
			operationType: OperationType.BeforeUpdate,
			id: params.id,
		})

		const whereWithACLCondition = this._buildWhereWithACL(
			{},
			params.context,
			'write',
		)

		const object = await this.adapter.updateObject({
			...params,
			data: newData,
			where: whereWithACLCondition,
		})

		await hook.runOnSingleObject({
			operationType: OperationType.AfterUpdate,
			object,
		})

		const objectToReturn = await this.getObject({
			className: params.className,
			context: params.context,
			fields: params.fields,
			id: object.id,
			skipHooks: true,
		})

		return objectToReturn
	}

	async updateObjects<
		U extends keyof T['types'],
		K extends keyof T['types'][U],
		W extends keyof T['types'][U],
	>(params: UpdateObjectsOptions<U, K, W>) {
		const whereObject = await this._getWhereObjectWithPointerOrRelation(
			params.className,
			params.where || {},
			params.context,
		)

		const hook = initializeHook({
			className: params.className,
			context: params.context,
			newData: params.data,
		})

		const whereWithACLCondition = this._buildWhereWithACL(
			whereObject,
			params.context,
			'write',
		)

		const { newData } = await hook.runOnMultipleObjects({
			operationType: OperationType.BeforeUpdate,
			where: whereWithACLCondition,
		})

		const objects = await this.adapter.updateObjects({
			...params,
			data: newData[0],
			where: whereWithACLCondition,
		})

		const objectsId = objects.map((object) => object.id)

		await hook.runOnMultipleObjects({
			operationType: OperationType.AfterUpdate,
			objects,
		})

		const objectsToReturn = await this.getObjects({
			className: params.className,
			context: params.context,
			fields: params.fields,
			// @ts-expect-error
			where: { id: { in: objectsId } },
			skipHooks: true,
		})

		return objectsToReturn
	}

	async deleteObject<
		U extends keyof T['types'],
		K extends keyof T['types'][U],
	>(params: DeleteObjectOptions<U, K>) {
		const hook = initializeHook({
			className: params.className,
			context: params.context,
		})

		const whereWithACLCondition = this._buildWhereWithACL(
			{},
			params.context,
			'write',
		)

		const objectBeforeDelete = await this.getObject(params)

		const { object } = await hook.runOnSingleObject({
			operationType: OperationType.BeforeDelete,
			id: params.id,
		})

		// @ts-expect-error
		await this.adapter.deleteObject({
			...params,
			where: whereWithACLCondition,
		})

		await hook.runOnSingleObject({
			operationType: OperationType.AfterDelete,
			object,
		})

		return objectBeforeDelete
	}

	async deleteObjects<
		U extends keyof T['types'],
		K extends keyof T['types'][U],
	>(params: DeleteObjectsOptions<U, K>) {
		const whereObject = await this._getWhereObjectWithPointerOrRelation(
			params.className,
			params.where || {},
			params.context,
		)

		const hook = initializeHook({
			className: params.className,
			context: params.context,
		})

		const whereWithACLCondition = this._buildWhereWithACL(
			whereObject,
			params.context,
			'write',
		)

		const objectBeforeDelete = await this.getObjects(params)

		const { objects } = await hook.runOnMultipleObjects({
			operationType: OperationType.BeforeDelete,
			where: whereWithACLCondition,
		})

		await this.adapter.deleteObjects({
			...params,
			where: whereWithACLCondition,
		})

		await hook.runOnMultipleObjects({
			operationType: OperationType.AfterDelete,
			objects,
		})

		return objectBeforeDelete
	}
}
