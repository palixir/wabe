import type { WibeAppTypes } from '../..'
import { OperationType, initializeHook } from '../../hooks'
import type { WibeContext } from '../../server/interface'
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
			skipHooks: params.skipHooks,
		})

		await hook.run({
			operationType: OperationType.BeforeRead,
			id: params.id,
		})

		const dataOfCurrentObject = await this.adapter.getObject({
			...params,
			fields: [...fieldsWithoutPointers, ...(pointersFieldsId || [])],
		})

		await hook.run({
			operationType: OperationType.AfterRead,
			id: params.id,
		})

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
			skipHooks: params.skipHooks,
		})

		await hook.run({
			operationType: OperationType.BeforeRead,
			where: params.where,
		})

		const dataOfCurrentObject = await this.adapter.getObjects({
			...params,
			where: params.where ? where : undefined,
			// @ts-expect-error
			fields: [...fieldsWithoutPointers, ...(pointersFieldsId || [])],
		})

		await hook.run({
			operationType: OperationType.AfterRead,
			where: params.where,
		})

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

		const arrayOfComputedData = await hook.run({
			operationType: OperationType.BeforeCreate,
		})

		const res = await this.adapter.createObject({
			...params,
			data: arrayOfComputedData,
		})

		await hook.run({ operationType: OperationType.AfterCreate, id: res.id })

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
			hooks.map((hook) =>
				hook.run({ operationType: OperationType.BeforeCreate }),
			),
		)

		const res = await this.adapter.createObjects({
			...params,
			data: arrayOfComputedData,
		})

		const arrayOfId = res.map((result) => result.id)

		await Promise.all(
			hooks.map((hook) =>
				hook.run({
					operationType: OperationType.AfterCreate,
					where: {
						id: { in: arrayOfId },
					},
				}),
			),
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
		})

		const arrayOfComputedData = await hook.run({
			operationType: OperationType.BeforeUpdate,
			id: params.id,
		})

		const res = await this.adapter.updateObject({
			...params,
			data: arrayOfComputedData,
		})

		await hook.run({
			operationType: OperationType.AfterUpdate,
			id: params.id,
		})

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
		})

		const arrayOfComputedData = await hook.run({
			operationType: OperationType.BeforeUpdate,
			where: params.where,
		})

		const res = await this.adapter.updateObjects({
			...params,
			data: arrayOfComputedData,
			where: whereObject,
		})

		await hook.run({
			operationType: OperationType.AfterUpdate,
			where: params.where,
		})

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
		})

		await hook.run({
			operationType: OperationType.BeforeDelete,
			id: params.id,
		})

		await this.adapter.deleteObject(params)

		await hook.run({
			operationType: OperationType.AfterDelete,
			id: params.id,
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

		const objectsBeforeDelete = await this.getObjects(params)

		const hook = await initializeHook({
			className: params.className,
			context: params.context,
			newData: null,
		})

		await hook.run({
			operationType: OperationType.BeforeDelete,
			where: params.where,
		})

		await this.adapter.deleteObjects({
			...params,
			where: whereObject,
		})

		await hook.run({
			operationType: OperationType.AfterDelete,
			where: params.where,
		})

		return objectsBeforeDelete
	}
}
