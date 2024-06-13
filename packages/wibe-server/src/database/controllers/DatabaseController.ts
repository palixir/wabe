import { WibeApp } from '../../..'
import type { WibeSchemaTypes } from '../../../generated/wibe'
import { OperationType, findHooksAndExecute } from '../../hooks'
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

export class DatabaseController {
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

	_getPointerObject(className: string, fields: string[]): PointerFields {
		const realClass = WibeApp.config.schema.class.find(
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

	_isRelationField<T extends keyof WibeSchemaTypes>(
		originClassName: T,
		pointerClassName: string,
	) {
		return WibeApp.config.schema.class.some(
			(c) =>
				c.name.toLowerCase() === originClassName.toLowerCase() &&
				Object.values(c.fields).find(
					(field) =>
						field.type === 'Relation' &&
						field.class.toLowerCase() ===
							pointerClassName.toLowerCase(),
				),
		)
	}

	_isPointerField<T extends keyof WibeSchemaTypes>(
		originClassName: T,
		pointerClassName: string,
	) {
		return WibeApp.config.schema.class.some(
			(c) =>
				c.name.toLowerCase() === originClassName.toLowerCase() &&
				Object.values(c.fields).find(
					(field) =>
						field.type === 'Pointer' &&
						field.class.toLowerCase() ===
							pointerClassName.toLowerCase(),
				),
		)
	}

	async _getFinalObjectWithPointer<
		T extends keyof WibeSchemaTypes,
		K extends keyof WibeSchemaTypes[T],
	>(
		objectData: Pick<WibeSchemaTypes[T], K> | null,
		pointersObject: PointerObject,
		originClassName: T,
	) {
		return Object.entries(pointersObject).reduce(
			async (
				accPromise,
				[pointerField, { fieldsOfPointerClass, pointerClass }],
			) => {
				const acc = await accPromise

				const isPointer = this._isPointerField(
					originClassName,
					pointerClass,
				)

				if (isPointer) {
					const pointerObject = await this.getObject({
						// @ts-expect-error
						className: pointerClass,
						// @ts-expect-error
						fields: fieldsOfPointerClass,
						// @ts-expect-error
						id: objectData[pointerField],
					})

					return {
						...acc,
						[pointerField]: pointerObject,
					}
				}

				const isRelation = this._isRelationField(
					originClassName,
					pointerClass,
				)

				if (isRelation) {
					const relationObjects = await this.getObjects({
						// @ts-expect-error
						className: pointerClass,
						// @ts-expect-error
						fields: fieldsOfPointerClass,
						// @ts-expect-error
						where: { id: { in: objectData[pointerField] } },
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
			}),
		)
	}

	async _getWhereObjectWithPointerOrRelation<T extends keyof WibeSchemaTypes>(
		className: T,
		where: WhereType<T>,
	) {
		const whereKeys = Object.keys(where) as Array<keyof WhereType<T>>

		const realClass = WibeApp.config.schema.class.find(
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

			const fieldTargetClass = field.class

			const objects = await this.getObjects({
				className: fieldTargetClass,
				fields: ['id'],
				// @ts-expect-error
				where: { ...where[fieldName] },
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

	async getObject<
		T extends keyof WibeSchemaTypes,
		K extends keyof WibeSchemaTypes[T],
	>(
		params: GetObjectOptions<T, K>,
	): Promise<Pick<WibeSchemaTypes[T], K> | null> {
		const fields = (params.fields || []) as string[]

		const { pointersFieldsId, pointers } = this._getPointerObject(
			params.className,
			fields,
		)

		const fieldsWithoutPointers = fields.filter(
			(field) => !field.includes('.'),
		)

		await findHooksAndExecute({
			className: params.className,
			context: params.context,
			data: [],
			operationType: OperationType.BeforeRead,
		})

		const dataOfCurrentObject = await this.adapter.getObject({
			...params,
			// @ts-expect-error
			fields: [...fieldsWithoutPointers, ...(pointersFieldsId || [])],
		})

		await findHooksAndExecute({
			className: params.className,
			context: params.context,
			data: [dataOfCurrentObject || {}],
			operationType: OperationType.AfterRead,
		})

		if (!dataOfCurrentObject) return null

		return this._getFinalObjectWithPointer(
			dataOfCurrentObject,
			pointers,
			params.className,
		) as any
	}

	async getObjects<
		T extends keyof WibeSchemaTypes,
		K extends keyof WibeSchemaTypes[T],
	>(params: GetObjectsOptions<T, K>): Promise<Pick<WibeSchemaTypes[T], K>[]> {
		const fields = (params.fields || []) as string[]

		const { pointersFieldsId, pointers } = this._getPointerObject(
			params.className,
			fields,
		)

		const fieldsWithoutPointers = fields.filter(
			(field) => !field.includes('.'),
		)

		const where = await this._getWhereObjectWithPointerOrRelation(
			params.className,
			params.where || {},
		)

		await findHooksAndExecute({
			className: params.className,
			context: params.context,
			data: [],
			operationType: OperationType.BeforeRead,
		})

		const dataOfCurrentObject = await this.adapter.getObjects({
			...params,
			where: params.where ? where : undefined,
			// @ts-expect-error
			fields: [...fieldsWithoutPointers, ...(pointersFieldsId || [])],
		})

		await findHooksAndExecute({
			className: params.className,
			context: params.context,
			data: dataOfCurrentObject || [],
			operationType: OperationType.AfterRead,
		})

		return Promise.all(
			dataOfCurrentObject.map((data) =>
				this._getFinalObjectWithPointer(
					data,
					pointers,
					params.className,
				),
			),
		) as Promise<Pick<WibeSchemaTypes[T], K>[]>
	}

	async createObject<
		T extends keyof WibeSchemaTypes,
		K extends keyof WibeSchemaTypes[T],
		W extends keyof WibeSchemaTypes[T],
	>(params: CreateObjectOptions<T, K, W>) {
		const arrayOfComputedData = await findHooksAndExecute({
			className: params.className,
			context: params.context,
			data: [params.data],
			operationType: OperationType.BeforeCreate,
		})

		const res = await this.adapter.createObject({
			...params,
			data: arrayOfComputedData[0],
		})

		await findHooksAndExecute({
			className: params.className,
			data: [res],
			operationType: OperationType.AfterInsert,
			context: params.context,
		})

		return res
	}

	async createObjects<
		T extends keyof WibeSchemaTypes,
		K extends keyof WibeSchemaTypes[T],
		W extends keyof WibeSchemaTypes[T],
	>(params: CreateObjectsOptions<T, K, W>) {
		const arrayOfComputedData = await findHooksAndExecute({
			className: params.className,
			context: params.context,
			data: params.data,
			operationType: OperationType.BeforeCreate,
		})

		const res = await this.adapter.createObjects({
			...params,
			data: arrayOfComputedData,
		})

		await findHooksAndExecute({
			className: params.className,
			context: params.context,
			data: params.data,
			operationType: OperationType.AfterInsert,
		})

		return res
	}

	async updateObject<
		T extends keyof WibeSchemaTypes,
		K extends keyof WibeSchemaTypes[T],
		W extends keyof WibeSchemaTypes[T],
	>(params: UpdateObjectOptions<T, K, W>) {
		const arrayOfComputedData = await findHooksAndExecute({
			className: params.className,
			context: params.context,
			data: [params.data],
			operationType: OperationType.BeforeUpdate,
		})

		const res = await this.adapter.updateObject({
			...params,
			data: arrayOfComputedData[0],
		})

		await findHooksAndExecute({
			className: params.className,
			data: [res],
			operationType: OperationType.AfterUpdate,
			context: params.context,
		})

		return res
	}

	async updateObjects<
		T extends keyof WibeSchemaTypes,
		K extends keyof WibeSchemaTypes[T],
		W extends keyof WibeSchemaTypes[T],
	>(params: UpdateObjectsOptions<T, K, W>) {
		const whereObject = await this._getWhereObjectWithPointerOrRelation(
			params.className,
			params.where || {},
		)

		const arrayOfComputedData = await findHooksAndExecute({
			className: params.className,
			context: params.context,
			data: [params.data],
			operationType: OperationType.BeforeUpdate,
		})

		const res = await this.adapter.updateObjects({
			...params,
			data: arrayOfComputedData[0],
			where: whereObject,
		})

		await findHooksAndExecute({
			className: params.className,
			data: [res],
			operationType: OperationType.AfterUpdate,
			context: params.context,
		})

		return res
	}

	async deleteObject<
		T extends keyof WibeSchemaTypes,
		K extends keyof WibeSchemaTypes[T],
	>(params: DeleteObjectOptions<T, K>) {
		const objectBeforeDelete = await this.getObject({
			...params,
		})

		if (!objectBeforeDelete) return null

		await findHooksAndExecute({
			className: params.className,
			context: params.context,
			data: [objectBeforeDelete],
			operationType: OperationType.BeforeDelete,
		})

		await this.adapter.deleteObject(params)

		await findHooksAndExecute({
			className: params.className,
			context: params.context,
			data: [objectBeforeDelete],
			operationType: OperationType.AfterDelete,
		})

		return objectBeforeDelete
	}

	async deleteObjects<
		T extends keyof WibeSchemaTypes,
		K extends keyof WibeSchemaTypes[T],
	>(params: DeleteObjectsOptions<T, K>) {
		const whereObject = await this._getWhereObjectWithPointerOrRelation(
			params.className,
			params.where || {},
		)

		const objectsBeforeDelete = await this.getObjects({
			...params,
		})

		await findHooksAndExecute({
			className: params.className,
			context: params.context,
			data: objectsBeforeDelete,
			operationType: OperationType.BeforeDelete,
		})

		await this.adapter.deleteObjects({
			...params,
			where: whereObject,
		})

		await findHooksAndExecute({
			className: params.className,
			context: params.context,
			data: objectsBeforeDelete,
			operationType: OperationType.AfterDelete,
		})

		return objectsBeforeDelete
	}
}
