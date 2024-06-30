import type { WibeAppTypes } from '../..'
import { OperationType, initializeHook } from '../../hooks'
import type { Context } from '../../server/interface'
import type {
	CreateObjectOptions,
	CreateObjectsOptions,
	DatabaseAdapter,
	DeleteObjectOptions,
	DeleteObjectsOptions,
	GetObjectOptions,
	GetObjectsOptions,
	UpdateObjectOptions,
	UpdateObjectsOptions,
	WhereType,
} from '../adapters/adaptersInterface'

type PointerObject = Record<
	string,
	{
		pointerClass: string
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
		context: Context<T>,
	): PointerFields {
		const realClass = context.config.schema.classes.find(
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
		pointerClassName: string,
		context: Context<T>,
	) {
		return context.config.schema.classes.some(
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
		pointerClassName: string,
		context: Context<T>,
	) {
		return context.config.schema.classes.some(
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
		objectData: Pick<T['types'][U], K> | null,
		pointersObject: PointerObject,
		originClassName: U,
		context: Context<T>,
	): Promise<Record<any, any>> {
		return Object.entries(pointersObject).reduce(
			async (
				accPromise,
				[pointerField, { fieldsOfPointerClass, pointerClass }],
			) => {
				const acc = await accPromise

				const isPointer = this._isPointerField(
					originClassName,
					pointerClass,
					context,
				)

				if (isPointer) {
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
					pointerClass,
					context,
				)

				if (isRelation) {
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

	async _getWhereObjectWithPointerOrRelation<U extends keyof T['types']>(
		className: U,
		where: WhereType<U>,
		context: Context<T>,
	) {
		const whereKeys = Object.keys(where) as Array<keyof WhereType<U>>

		const realClass = context.config.schema.classes.find(
			// @ts-expect-error
			(c) => c.name.toLowerCase() === className.toLowerCase(),
		)

		const newWhereObject = await whereKeys.reduce(async (acc, key) => {
			const currentAcc = await acc

			const fieldName = key as string

			const field = realClass?.fields[fieldName]

			if (fieldName === 'AND' || fieldName === 'OR') {
				const newWhere = await Promise.all(
					(where[fieldName] as any).map((whereObject: any) =>
						this._getWhereObjectWithPointerOrRelation(
							className,
							whereObject,
							context,
						),
					),
				)

				return {
					...currentAcc,
					[fieldName]: newWhere,
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
				where: { ...where[fieldName] },
				context,
			})

			return {
				...acc,
				[fieldName]: {
					in: objects.map((object) => object.id),
				},
			}
		}, Promise.resolve({}))

		return {
			...where,
			...newWhereObject,
		}
	}

	async getObject<U extends keyof T['types'], K extends keyof T['types'][U]>(
		params: GetObjectOptions<U, K>,
	): Promise<Pick<T['types'][U], K> | null> {
		const fields = (params.fields || []) as string[]

		const { pointersFieldsId, pointers } = this._getPointerObject(
			params.className,
			fields,
			params.context,
		)

		const fieldsWithoutPointers = fields.filter(
			(field) => !field.includes('.'),
		)

		const hook = await initializeHook({
			className: params.className,
			context: params.context,
			newData: null,
			id: params.id,
		})

		await hook.run(OperationType.BeforeRead)

		const dataOfCurrentObject = await this.adapter.getObject({
			...params,
			fields: [...fieldsWithoutPointers, ...(pointersFieldsId || [])],
		})

		await hook.run(OperationType.AfterRead)

		if (!dataOfCurrentObject) return null

		return this._getFinalObjectWithPointer(
			dataOfCurrentObject,
			pointers,
			params.className,
			params.context,
		) as any
	}

	async getObjects<U extends keyof T['types'], K extends keyof T['types'][U]>(
		params: GetObjectsOptions<U, K>,
	): Promise<Pick<T['types'][U], K>[]> {
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

		const hook = await initializeHook({
			className: params.className,
			context: params.context,
			newData: null,
			where: params.where,
			skipHooks: params.skipHooks,
		})

		await hook.run(OperationType.BeforeRead)

		const dataOfCurrentObject = await this.adapter.getObjects({
			...params,
			where: params.where ? where : undefined,
			fields: [...fieldsWithoutPointers, ...(pointersFieldsId || [])],
		})

		await hook.run(OperationType.AfterRead)

		return Promise.all(
			dataOfCurrentObject.map((data) =>
				this._getFinalObjectWithPointer(
					data,
					pointers,
					params.className,
					params.context,
				),
			),
		) as Promise<Pick<T['types'][U], K>[]>
	}

	async createObject<
		U extends keyof T['types'],
		K extends keyof T['types'][U],
		W extends keyof T['types'][U],
	>(params: CreateObjectOptions<U, K, W>) {
		const hook = await initializeHook({
			className: params.className,
			context: params.context,
			newData: params.data,
		})

		const arrayOfComputedData = await hook.run(OperationType.BeforeCreate)

		const res = await this.adapter.createObject({
			...params,
			data: arrayOfComputedData,
		})

		await hook.run(OperationType.AfterCreate)

		return res
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
			hooks.map((hook) => hook.run(OperationType.BeforeCreate)),
		)

		const res = await this.adapter.createObjects({
			...params,
			data: arrayOfComputedData,
		})

		await Promise.all(
			hooks.map((hook) => hook.run(OperationType.AfterCreate)),
		)

		return res
	}

	async updateObject<
		U extends keyof T['types'],
		K extends keyof T['types'][U],
		W extends keyof T['types'][U],
	>(params: UpdateObjectOptions<U, K, W>) {
		const hook = await initializeHook({
			className: params.className,
			context: params.context,
			newData: params.data,
			id: params.id,
		})

		const arrayOfComputedData = await hook.run(OperationType.BeforeUpdate)

		const res = await this.adapter.updateObject({
			...params,
			data: arrayOfComputedData,
		})

		await hook.run(OperationType.AfterUpdate)

		return res
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

		const hook = await initializeHook({
			className: params.className,
			context: params.context,
			newData: params.data,
			where: params.where,
		})

		const arrayOfComputedData = await hook.run(OperationType.BeforeUpdate)

		const res = await this.adapter.updateObjects({
			...params,
			data: arrayOfComputedData,
			where: whereObject,
		})

		await hook.run(OperationType.AfterUpdate)

		return res
	}

	async deleteObject<
		U extends keyof T['types'],
		K extends keyof T['types'][U],
	>(params: DeleteObjectOptions<U, K>) {
		const objectBeforeDelete = await this.getObject(params)

		if (!objectBeforeDelete) return null

		const hook = await initializeHook({
			className: params.className,
			context: params.context,
			newData: null,
			id: params.id,
		})

		await hook.run(OperationType.BeforeDelete)

		await this.adapter.deleteObject(params)

		await hook.run(OperationType.AfterDelete)

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

		const objectsBeforeDelete = await this.getObjects(params)

		const hook = await initializeHook({
			className: params.className,
			context: params.context,
			newData: null,
			where: params.where,
		})

		await hook.run(OperationType.BeforeDelete)

		await this.adapter.deleteObjects({
			...params,
			where: whereObject,
		})

		await hook.run(OperationType.AfterDelete)

		return objectsBeforeDelete
	}
}
