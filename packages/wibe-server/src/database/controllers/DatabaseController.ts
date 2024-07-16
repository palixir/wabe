import type { WibeAppTypes } from '../..'
import { InMemoryCache } from '../../cache/InMemoryCache'
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
	public inMemoryCache: InMemoryCache<OutputType<any, any> | undefined>

	constructor(adapter: DatabaseAdapter) {
		this.adapter = adapter
		this.inMemoryCache = new InMemoryCache({ interval: 5000 })
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

	_buildCacheKey<U extends keyof T['types']>(
		className: U,
		id: string,
		fields: Array<string>,
	) {
		return `${String(className)}-${id}-${fields.join(',')}`
	}

	async getObject<U extends keyof T['types'], K extends keyof T['types'][U]>(
		params: GetObjectOptions<U, K>,
	): Promise<OutputType<U, K>> {
		const fields = params.fields as string[]

		const { context, className, skipHooks, id, where } = params

		const { pointersFieldsId, pointers } = this._getPointerObject(
			className,
			fields,
			context,
		)

		const hook = !skipHooks
			? initializeHook({
					className,
					context,
				})
			: undefined

		await hook?.runOnSingleObject({
			operationType: OperationType.BeforeRead,
			id,
		})

		const whereWithACLCondition = this._buildWhereWithACL(
			where || {},
			context,
			'read',
		)

		const fieldsWithoutPointers = fields.filter(
			(field) => !field.includes('.'),
		)

		const fieldsWithPointerFields = [
			...fieldsWithoutPointers,
			...(pointersFieldsId || []),
		]

		const object = await this.adapter.getObject({
			className,
			context,
			id,
			// @ts-expect-error
			fields: fieldsWithPointerFields,
			where: whereWithACLCondition,
		})

		const keyCache = this._buildCacheKey(
			className,
			object.id,
			fieldsWithPointerFields,
		)

		this.inMemoryCache.set(keyCache, object)

		await hook?.runOnSingleObject({
			operationType: OperationType.AfterRead,
			object,
		})

		const cacheObject = this.inMemoryCache.get(keyCache)

		const objectToReturn = cacheObject
			? cacheObject
			: await this.adapter.getObject({
					className,
					id,
					context,
					// @ts-expect-error
					fields: fieldsWithPointerFields,
					where: whereWithACLCondition,
				})

		return this._getFinalObjectWithPointer(
			objectToReturn,
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

		const fieldsWithPointerFields = [
			...fieldsWithoutPointers,
			...(pointersFieldsId || []),
		]

		const objects = await this.adapter.getObjects({
			...params,
			where: whereWithACLCondition,
			// @ts-expect-error
			fields: fieldsWithPointerFields,
		})

		objects.map((object) =>
			this.inMemoryCache.set(
				this._buildCacheKey(
					params.className,
					object.id,
					fieldsWithPointerFields,
				),
				object,
			),
		)

		await hook?.runOnMultipleObjects({
			operationType: OperationType.AfterRead,
			objects,
		})

		const objectsToReturn = await this.adapter.getObjects({
			...params,
			where: whereWithACLCondition,
			// @ts-expect-error
			fields: [...fieldsWithoutPointers, ...(pointersFieldsId || [])],
		})

		return Promise.all(
			objectsToReturn.map((object) =>
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
		const { className, context, data, fields } = params

		const hook = initializeHook({
			className,
			context,
			newData: data,
		})

		const { newData } = await hook.runOnSingleObject({
			operationType: OperationType.BeforeCreate,
		})

		const object = await this.adapter.createObject({
			className,
			context,
			fields,
			data: newData,
		})

		const keyCache = this._buildCacheKey(
			className,
			object.id,
			fields as string[],
		)

		this.inMemoryCache.set(keyCache, undefined)

		await hook.runOnSingleObject({
			operationType: OperationType.AfterCreate,
			object,
		})

		const objectToReturn = await this.getObject({
			className,
			context,
			fields,
			id: object.id,
			skipHooks: true,
		})

		return objectToReturn
	}

	async createObjects<
		U extends keyof T['types'],
		K extends keyof T['types'][U],
		W extends keyof T['types'][U],
	>({
		data,
		fields,
		className,
		context,
		limit,
		offset,
	}: CreateObjectsOptions<U, K, W>) {
		if (data.length === 0) return []

		const hooks = await Promise.all(
			data.map((newData) =>
				initializeHook({
					className,
					context,
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
			className,
			fields,
			context,
			data: arrayOfComputedData,
			limit,
			offset,
		})

		const objectsId = objects.map((object) => object.id)

		for (const id of objectsId) {
			const keyCache = this._buildCacheKey(
				className,
				id,
				fields as string[],
			)

			this.inMemoryCache.set(keyCache, undefined)
		}

		await Promise.all(
			hooks.map((hook) =>
				hook.runOnMultipleObjects({
					operationType: OperationType.AfterCreate,
					objects,
				}),
			),
		)

		const objectsToReturn = await this.getObjects({
			className,
			context,
			fields,
			// @ts-expect-error
			where: { id: { in: objectsId } },
			skipHooks: true,
			limit,
			offset,
		})

		return objectsToReturn
	}

	async updateObject<
		U extends keyof T['types'],
		K extends keyof T['types'][U],
		W extends keyof T['types'][U],
	>({ id, className, context, data, fields }: UpdateObjectOptions<U, K, W>) {
		const hook = initializeHook({
			className,
			context,
			newData: data,
		})

		const { newData } = await hook.runOnSingleObject({
			operationType: OperationType.BeforeUpdate,
			id,
		})

		const whereWithACLCondition = this._buildWhereWithACL(
			{},
			context,
			'write',
		)

		const object = await this.adapter.updateObject({
			className,
			fields,
			id,
			context,
			data: newData,
			where: whereWithACLCondition,
		})

		const keyCache = this._buildCacheKey(
			className,
			object.id,
			fields as string[],
		)

		this.inMemoryCache.set(keyCache, undefined)

		await hook.runOnSingleObject({
			operationType: OperationType.AfterUpdate,
			object,
		})

		const objectToReturn = await this.getObject({
			className,
			context,
			fields,
			id: object.id,
			skipHooks: true,
		})

		return objectToReturn
	}

	async updateObjects<
		U extends keyof T['types'],
		K extends keyof T['types'][U],
		W extends keyof T['types'][U],
	>({
		className,
		where,
		context,
		fields,
		data,
		limit,
		offset,
	}: UpdateObjectsOptions<U, K, W>) {
		const whereObject = await this._getWhereObjectWithPointerOrRelation(
			className,
			where || {},
			context,
		)

		const hook = initializeHook({
			className,
			context,
			newData: data,
		})

		const whereWithACLCondition = this._buildWhereWithACL(
			whereObject,
			context,
			'write',
		)

		const { newData } = await hook.runOnMultipleObjects({
			operationType: OperationType.BeforeUpdate,
			where: whereWithACLCondition,
		})

		const objects = await this.adapter.updateObjects({
			className,
			context,
			fields,
			data: newData[0],
			where: whereWithACLCondition,
			limit,
			offset,
		})

		const objectsId = objects.map((object) => object.id)

		for (const id of objectsId) {
			const keyCache = this._buildCacheKey(
				className,
				id,
				fields as string[],
			)

			this.inMemoryCache.set(keyCache, undefined)
		}

		await hook.runOnMultipleObjects({
			operationType: OperationType.AfterUpdate,
			objects,
		})

		const objectsToReturn = await this.getObjects({
			className,
			context,
			fields,
			// @ts-expect-error
			where: { id: { in: objectsId } },
			skipHooks: true,
			limit,
			offset,
		})

		return objectsToReturn
	}

	async deleteObject<
		U extends keyof T['types'],
		K extends keyof T['types'][U],
		W extends keyof T['types'][U],
	>(params: DeleteObjectOptions<U, K, W>) {
		const hook = initializeHook({
			className: params.className,
			context: params.context,
		})

		const whereWithACLCondition = this._buildWhereWithACL(
			{},
			params.context,
			'write',
		)

		// @ts-expect-error
		const objectBeforeDelete = await this.getObject(params)

		const { object } = await hook.runOnSingleObject({
			operationType: OperationType.BeforeDelete,
			id: params.id,
		})

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
		W extends keyof T['types'][U],
	>(params: DeleteObjectsOptions<U, K, W>) {
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

		// @ts-expect-error
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
