import { selectFieldsWithoutPrivateFields } from 'src/utils/helper'
import type { WabeTypes } from '../..'
import { initializeHook, OperationType } from '../hooks'
import type { SchemaInterface } from '../schema'
import type { WabeContext } from '../server/interface'
import { contextWithRoot, notEmpty } from '../utils/export'
import type { DevWabeTypes } from '../utils/helper'
import type {
	CountOptions,
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
} from './interface'

export type Select = Record<string, boolean>
type SelectWithObject = Record<string, object | boolean>

export class DatabaseController<T extends WabeTypes> {
	public adapter: DatabaseAdapter<T>

	constructor(adapter: DatabaseAdapter<T>) {
		this.adapter = adapter
	}

	/**
	 * Get a class definition from the schema by name (case-insensitive)
	 */
	_getClass(className: string | keyof T['types'], context: WabeContext<T>) {
		return context.wabe.config.schema?.classes?.find(
			(c) => c.name.toLowerCase() === String(className).toLowerCase(),
		)
	}

	/**
	 * Get field type and target class information
	 */
	_getFieldType(originClassName: string, fieldName: string, context: WabeContext<T>) {
		const realClass = this._getClass(originClassName, context)
		return realClass?.fields[fieldName] as { type: string; class?: string } | undefined
	}

	_getSelectMinusPointersAndRelations({
		className,
		context,
		select,
	}: {
		className: keyof T['types']
		context: WabeContext<T>
		select?: SelectWithObject
	}): {
		pointers: Record<string, { className: string; select: Select }>
		selectWithoutPointers: Select
	} {
		const realClass = this._getClass(className, context)

		if (!realClass) throw new Error('Class not found in schema')

		if (!select) return { pointers: {}, selectWithoutPointers: {} }

		const pointers: Record<string, { className: string; select: Select }> = {}
		const selectWithoutPointers: Select = {}

		const selectEntries = Object.entries(
			context.isRoot ? select : selectFieldsWithoutPrivateFields(select),
		)

		for (const [fieldName, value] of selectEntries) {
			const field = realClass.fields[fieldName]
			const isPointerOrRelation = field?.type === 'Pointer' || field?.type === 'Relation'

			if (!isPointerOrRelation) {
				selectWithoutPointers[fieldName] = true
			} else {
				pointers[fieldName] = {
					className: (field as { class: string }).class,
					select: (value === true ? undefined : value) as Select,
				}
			}
		}

		return { pointers, selectWithoutPointers }
	}

	_isFieldOfType(
		originClassName: string,
		pointerField: string,
		expectedType: 'Pointer' | 'Relation',
		context: WabeContext<T>,
		currentClassName?: string,
	): boolean {
		if (!currentClassName) return false

		const field = this._getFieldType(originClassName, pointerField, context)
		return (
			field?.type === expectedType && field.class?.toLowerCase() === currentClassName.toLowerCase()
		)
	}

	async _getWhereObjectWithPointerOrRelation<U extends keyof T['types']>(
		className: U,
		where: WhereType<T, U>,
		context: WabeContext<T>,
	) {
		const whereKeys = Object.keys(where) as Array<keyof WhereType<T, U>>

		const realClass = this._getClass(className, context)

		const newWhereObject = await whereKeys.reduce(async (acc, whereKey) => {
			const currentAcc = await acc

			const typedWhereKey = whereKey as string

			const field = realClass?.fields[typedWhereKey]

			if (typedWhereKey === 'AND' || typedWhereKey === 'OR') {
				const newWhere = await Promise.all(
					(where[typedWhereKey] as any).map((whereObject: any) =>
						this._getWhereObjectWithPointerOrRelation(className, whereObject, context),
					),
				)

				return {
					...currentAcc,
					[typedWhereKey]: newWhere,
				}
			}

			if (field?.type !== 'Pointer' && field?.type !== 'Relation') return acc

			// @ts-expect-error
			const fieldTargetClass = field.class

			const defaultWhere = where[typedWhereKey]

			const objects = await this.getObjects({
				className: fieldTargetClass,
				// @ts-expect-error
				select: { id: true },
				// @ts-expect-error
				where: defaultWhere,
				context,
			})

			return {
				...acc,
				// If we don't found any object we just execute the query with the default where
				// Without any transformation for pointer or relation
				// Ensure the 'in' condition is not empty to avoid unauthorized access
				...(objects.length > 0
					? {
							[typedWhereKey]: {
								in: objects.map((object) => object?.id).filter(notEmpty),
							},
						}
					: {}),
			}
		}, Promise.resolve({}))

		return {
			...where,
			...newWhereObject,
		}
	}

	_buildWhereWithACL<K extends keyof T['types']>(
		where: WhereType<T, K>,
		context: WabeContext<T>,
		operation: 'write' | 'read',
	): WhereType<T, K> {
		if (context.isRoot) return where

		const roleId = context.user?.role?.id
		const userId = context.user?.id

		// If we have an user we good right we return
		// If we don't have user we check role
		// If the role is good we return

		// @ts-expect-error
		return {
			AND: [
				{ ...where },
				// If the user is not connected we need to have a null acl
				!userId
					? {
							acl: { equalTo: null },
						}
					: undefined,
				// If we have user or role we need to check the acl
				userId || roleId
					? {
							OR: [
								{
									acl: { equalTo: null },
								},
								userId
									? {
											acl: {
												users: {
													contains: {
														userId,
														[operation]: true,
													},
												},
											},
										}
									: undefined,
								roleId
									? {
											AND: [
												{
													acl: {
														users: {
															notContains: {
																userId,
															},
														},
													},
												},
												{
													acl: {
														roles: {
															contains: {
																roleId,
																[operation]: true,
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

	/**
	 * Private helper to load a single object for hooks (skips hooks to avoid recursion)
	 */
	_loadObjectForHooks(className: keyof T['types'], context: WabeContext<T>) {
		return (id: string) =>
			this.getObject({
				className,
				context: contextWithRoot(context),
				id,
				_skipHooks: true,
			})
	}

	/**
	 * Private helper to load multiple objects for hooks (skips hooks to avoid recursion)
	 */
	_loadObjectsForHooks(className: keyof T['types'], context: WabeContext<T>) {
		return ({ where, ids }: { where?: WhereType<DevWabeTypes, any>; ids: string[] }) =>
			this.getObjects({
				className,
				context: contextWithRoot(context),
				// @ts-expect-error
				where: where ? where : { id: { in: ids } },
				_skipHooks: true,
			})
	}

	/**
	 * Generic executor for single object operations (create, update, delete, read)
	 * Encapsulates the hook lifecycle: Init -> Before -> Adapter -> After
	 */
	async _executeSingleOperationWithHooks<
		K extends keyof T['types'],
		U extends keyof T['types'][K],
	>({
		operationTypeBefore,
		operationTypeAfter,
		className,
		context,
		data,
		select,
		id,
		adapterCallback,
		inputObject,
	}: {
		operationTypeBefore: OperationType
		operationTypeAfter: OperationType
		className: K
		context: WabeContext<T>
		data?: any
		select?: Select
		id?: string
		inputObject?: OutputType<T, K, U>
		adapterCallback: (newData: any) => Promise<OutputType<T, K, U> | { id: string } | null>
	}) {
		const hook = initializeHook({
			className,
			context,
			newData: data,
			// @ts-expect-error
			select,
			objectLoader: this._loadObjectForHooks(className, context),
			objectsLoader: this._loadObjectsForHooks(className, context),
		})

		const { newData, object: objectFromHook } = await hook.runOnSingleObject({
			operationType: operationTypeBefore,
			id,

			object: inputObject,
		})

		const res = await adapterCallback(newData || data)

		if (!res) return null

		// If the operation is delete, we use the objectFromHook (snapshot before delete)
		// Otherwise we use the result from adapter (which might be just { id })
		// loading the full object if needed happens inside runOnSingleObject if 'id' is passed
		await hook.runOnSingleObject({
			operationType: operationTypeAfter,
			id: res.id,

			originalObject: objectFromHook,
		})

		return res
	}

	_getFinalObjectWithPointerAndRelation({
		pointers,
		context,
		originClassName,
		object,
		_skipHooks,
	}: {
		originClassName: string
		pointers: Record<string, { className: string; select: Select }>
		context: WabeContext<any>
		object: Record<string, any>
		_skipHooks?: boolean
	}) {
		return Object.entries(pointers).reduce(
			async (acc, [pointerField, { className: currentClassName, select: currentSelect }]) => {
				const accObject = await acc

				const isPointer = this._isFieldOfType(
					originClassName,
					pointerField,
					'Pointer',
					context,
					currentClassName,
				)

				if (isPointer) {
					if (!object[pointerField])
						return {
							...accObject,
							[pointerField]: null,
						}

					const objectOfPointerClass = await this.getObject({
						className: currentClassName,
						id: object[pointerField],
						context,
						// @ts-expect-error
						select: currentSelect,
						_skipHooks,
					})

					return {
						...accObject,
						[pointerField]: objectOfPointerClass,
					}
				}

				const isRelation = this._isFieldOfType(
					originClassName,
					pointerField,
					'Relation',
					context,
					currentClassName,
				)

				if (isRelation && object[pointerField]) {
					const selectWithoutTotalCount = Object.entries(currentSelect || {}).reduce(
						(acc2, [key, value]) => {
							if (key === 'totalCount') return acc2

							return {
								...acc2,
								[key]: value,
							}
						},
						{} as Record<string, any>,
					)

					const relationObjects = await this.getObjects({
						className: currentClassName,
						select: selectWithoutTotalCount,
						// @ts-expect-error
						where: { id: { in: object[pointerField] } },
						context,
						_skipHooks,
					})

					return {
						...accObject,
						[pointerField]: context.isGraphQLCall
							? {
									totalCount: relationObjects.length,
									edges: relationObjects.map((object: any) => ({
										node: object,
									})),
								}
							: relationObjects,
					}
				}

				return accObject
			},
			Promise.resolve({} as Record<string, any>),
		)
	}

	async close() {
		await this.adapter.close()
	}

	createClassIfNotExist(className: string, schema: SchemaInterface<T>): Promise<any> {
		return this.adapter.createClassIfNotExist(className, schema)
	}

	initializeDatabase(schema: SchemaInterface<T>): Promise<void> {
		return this.adapter.initializeDatabase(schema)
	}

	async count<K extends keyof T['types']>({
		className,
		context,
		where,
	}: CountOptions<T, K>): Promise<number> {
		const whereWithACLCondition = this._buildWhereWithACL(where || {}, context, 'read')

		const hook = initializeHook({
			className,
			context,
			select: {},
		})

		await hook?.runOnSingleObject({
			operationType: OperationType.BeforeRead,
		})

		const count = await this.adapter.count({
			className,
			context,
			where: whereWithACLCondition,
		})

		await hook?.runOnSingleObject({
			operationType: OperationType.AfterRead,
		})

		return count
	}

	async clearDatabase(): Promise<void> {
		await this.adapter.clearDatabase()
	}

	async getObject<K extends keyof T['types'], U extends keyof T['types'][K]>({
		select,
		className,
		context,
		_skipHooks,
		id,
		where,
	}: GetObjectOptions<T, K, U>): Promise<OutputType<T, K, U>> {
		const { pointers, selectWithoutPointers } = this._getSelectMinusPointersAndRelations({
			className,
			context,
			select: select as SelectWithObject,
		})

		const hook = !_skipHooks
			? initializeHook({
					className,
					context,
					select: selectWithoutPointers,
					objectLoader: this._loadObjectForHooks(className, context),
					objectsLoader: this._loadObjectsForHooks(className, context),
				})
			: undefined

		await hook?.runOnSingleObject({
			operationType: OperationType.BeforeRead,
			id,
		})

		const whereWithACLCondition = this._buildWhereWithACL(where || {}, context, 'read')

		const selectWithPointersAndRelationsToGetId = Object.keys(pointers).reduce((acc, fieldName) => {
			acc[fieldName] = true

			return acc
		}, selectWithoutPointers)

		const objectToReturn = await this.adapter.getObject({
			className,
			id,
			context: contextWithRoot(context),
			// @ts-expect-error
			select: !select ? undefined : selectWithPointersAndRelationsToGetId,
			where: whereWithACLCondition,
		})

		const finalObject = {
			...objectToReturn,
			...(await this._getFinalObjectWithPointerAndRelation({
				context,
				// @ts-expect-error
				originClassName: className,
				pointers,
				// @ts-expect-error
				object: objectToReturn,
				_skipHooks,
			})),
		}

		const afterReadResult = await hook?.runOnSingleObject({
			operationType: OperationType.AfterRead,
			id,
			// @ts-expect-error
			object: finalObject,
		})

		return afterReadResult?.object || finalObject
	}

	async getObjects<
		K extends keyof T['types'],
		U extends keyof T['types'][K],
		W extends keyof T['types'][K],
	>({
		className,
		select,
		context,
		where,
		_skipHooks,
		first,
		offset,
		order,
	}: GetObjectsOptions<T, K, U, W>): Promise<OutputType<T, K, W>[]> {
		const { pointers, selectWithoutPointers } = this._getSelectMinusPointersAndRelations({
			className,
			context,
			select: select as SelectWithObject,
		})

		const whereWithPointer = await this._getWhereObjectWithPointerOrRelation(
			className,
			where || {},
			context,
		)

		const whereWithACLCondition = this._buildWhereWithACL(whereWithPointer || {}, context, 'read')

		const selectWithPointersAndRelationsToGetId = Object.keys(pointers).reduce((acc, fieldName) => {
			acc[fieldName] = true

			return acc
		}, selectWithoutPointers)

		const hook = !_skipHooks
			? initializeHook({
					className,
					select: selectWithoutPointers,
					context,
					objectLoader: this._loadObjectForHooks(className, context),
					objectsLoader: this._loadObjectsForHooks(className, context),
				})
			: undefined

		await hook?.runOnMultipleObjects({
			operationType: OperationType.BeforeRead,
			where: whereWithACLCondition,
		})

		const objectsToReturn = await this.adapter.getObjects({
			className,
			context: contextWithRoot(context),
			first,
			offset,
			where: whereWithACLCondition,
			// @ts-expect-error
			select: !select ? undefined : selectWithPointersAndRelationsToGetId,
			order,
		})

		const objectsWithPointers = await Promise.all(
			objectsToReturn.map(async (object) => {
				return {
					...object,
					...(await this._getFinalObjectWithPointerAndRelation({
						// @ts-expect-error
						object,
						context,
						// @ts-expect-error
						originClassName: className,
						pointers,
						_skipHooks,
					})),
				}
			}),
		)

		const afterReadResults = await hook?.runOnMultipleObjects({
			operationType: OperationType.AfterRead,
			// @ts-expect-error
			objects: objectsWithPointers,
		})

		return (afterReadResults?.objects || objectsWithPointers) as unknown as Promise<
			OutputType<T, K, W>[]
		>
	}

	async createObject<
		K extends keyof T['types'],
		U extends keyof T['types'][K],
		W extends keyof T['types'][K],
	>({
		className,
		context,
		data,
		select,
	}: CreateObjectOptions<T, K, U, W>): Promise<OutputType<T, K, W>> {
		// Here data.file is null but should not be

		const result = await this._executeSingleOperationWithHooks<K, W>({
			operationTypeBefore: OperationType.BeforeCreate,
			operationTypeAfter: OperationType.AfterCreate,
			className,
			context,
			data,
			select: select as Select,
			adapterCallback: async (newData) => {
				const res = await this.adapter.createObject({
					className,
					context,
					select,
					data: newData || data,
				})

				return { id: res.id }
			},
		})

		const res = result as { id: string }

		if (select && Object.keys(select).length === 0) return null

		return this.getObject({
			className,
			context: contextWithRoot(context),
			select: selectFieldsWithoutPrivateFields(select),
			id: res.id,
		})
	}

	async createObjects<
		K extends keyof T['types'],
		U extends keyof T['types'][K],
		W extends keyof T['types'][K],
		X extends keyof T['types'][K],
	>({
		data,
		select,
		className,
		context,
		first,
		offset,
		order,
	}: CreateObjectsOptions<T, K, U, W, X>): Promise<OutputType<T, K, W>[]> {
		if (data.length === 0) return []

		const hooks = await Promise.all(
			data.map((newData) =>
				initializeHook({
					className,
					context,
					newData,
					// @ts-expect-error
					select,
					objectLoader: this._loadObjectForHooks(className, context),
					objectsLoader: this._loadObjectsForHooks(className, context),
				}),
			),
		)

		const arrayOfComputedData = (
			await Promise.all(
				hooks.map(
					async (hook) =>
						(
							await hook.runOnMultipleObjects({
								operationType: OperationType.BeforeCreate,
							})
						)?.newData[0],
				),
			)
		).filter(notEmpty)

		const listOfIds = await this.adapter.createObjects({
			className,
			select,
			context,
			data: arrayOfComputedData,
			first,
			offset,
			order,
		})

		const ids = listOfIds.map(({ id }) => id)

		await Promise.all(
			hooks.map((hook) =>
				hook.runOnMultipleObjects({
					operationType: OperationType.AfterCreate,
					ids,
				}),
			),
		)

		if (select && Object.keys(select).length === 0) return []

		return this.getObjects({
			className,
			context: contextWithRoot(context),
			select,
			// @ts-expect-error
			where: { id: { in: ids } },
			first,
			offset,
			order,
		})
	}

	async updateObject<
		K extends keyof T['types'],
		U extends keyof T['types'][K],
		W extends keyof T['types'][K],
	>({
		id,
		className,
		context,
		data,
		select,
		_skipHooks,
	}: UpdateObjectOptions<T, K, U, W>): Promise<OutputType<T, K, W>> {
		if (_skipHooks) {
			const whereWithACLCondition = this._buildWhereWithACL({}, context, 'write')

			return this.adapter.updateObject({
				className,
				select,
				id,
				context,
				data,
				where: whereWithACLCondition,
			}) as Promise<OutputType<T, K, W>>
		}

		await this._executeSingleOperationWithHooks<K, W>({
			operationTypeBefore: OperationType.BeforeUpdate,
			operationTypeAfter: OperationType.AfterUpdate,
			className,
			context,
			data,
			id,
			select: select as Select,
			adapterCallback: async (newData) => {
				const whereWithACLCondition = this._buildWhereWithACL({}, context, 'write')

				await this.adapter.updateObject({
					className,
					select,
					id,
					context,
					data: newData || data,
					where: whereWithACLCondition,
				})

				return { id }
			},
		})

		if (select && Object.keys(select).length === 0) return null

		return this.getObject({
			className,
			context,
			select,
			id,
		})
	}

	async updateObjects<
		K extends keyof T['types'],
		U extends keyof T['types'][K],
		W extends keyof T['types'][K],
		X extends keyof T['types'][K],
	>({
		className,
		where,
		context,
		select,
		data,
		first,
		offset,
		order,
		_skipHooks,
	}: UpdateObjectsOptions<T, K, U, W, X>): Promise<OutputType<T, K, W>[]> {
		const whereObject = await this._getWhereObjectWithPointerOrRelation(
			className,
			where || {},
			context,
		)

		const hook = !_skipHooks
			? initializeHook({
					className,
					context,
					newData: data,
					// @ts-expect-error
					select,
					objectLoader: this._loadObjectForHooks(className, context),
					objectsLoader: this._loadObjectsForHooks(className, context),
				})
			: undefined

		const whereWithACLCondition = this._buildWhereWithACL(whereObject, context, 'write')

		const resultsAfterBeforeUpdate = await hook?.runOnMultipleObjects({
			operationType: OperationType.BeforeUpdate,
			where: whereWithACLCondition,
		})

		const objects = await this.adapter.updateObjects({
			className,
			context,
			select,
			data: resultsAfterBeforeUpdate?.newData[0] || data,
			where: whereWithACLCondition,
			first,
			offset,
			order,
		})

		const objectsId = objects.map((object) => object?.id).filter(notEmpty)

		await hook?.runOnMultipleObjects({
			operationType: OperationType.AfterUpdate,
			ids: objectsId,
			originalObjects: resultsAfterBeforeUpdate?.objects || [],
		})

		if (select && Object.keys(select).length === 0) return []

		return this.getObjects({
			className,
			context,
			select,
			// @ts-expect-error
			where: { id: { in: objectsId } },
			first,
			offset,
			order,
		})
	}

	async deleteObject<K extends keyof T['types'], U extends keyof T['types'][K]>({
		context,
		className,
		id,
		select,
	}: DeleteObjectOptions<T, K, U>): Promise<OutputType<T, K, U>> {
		const result = (await this._executeSingleOperationWithHooks<K, U>({
			operationTypeBefore: OperationType.BeforeDelete,
			operationTypeAfter: OperationType.AfterDelete,
			className,
			context,
			id,
			select: select as Select,
			adapterCallback: async (_newData) => {
				const whereWithACLCondition = this._buildWhereWithACL({}, context, 'write')

				// We need to fetch the object before deleting it if we want to return it
				// But executeSingleOperationWithHooks already fetched it in runOnSingleObject if an id is present
				// Wait, runOnSingleObject fetches it for the hook context 'object', but does not return it unless we use it.
				// However, if we utilize _executeSingleOperationWithHooks, the 'object' from before-hook is kept.
				// But _executeSingleOperationWithHooks logic for delete is slightly different regarding return value:
				// Delete usually returns the deleted object.
				// Update: My abstraction returns 'res' from adapterCallback.
				// So I need to return the object here.

				let objectBeforeDelete = null

				if (select && Object.keys(select).length > 0)
					objectBeforeDelete = await this.getObject({
						className,
						context,
						select,
						id,
					})

				await this.adapter.deleteObject({
					className,
					context,
					id,

					where: whereWithACLCondition,
				})

				return objectBeforeDelete || { id }
			},
		})) as unknown as OutputType<T, K, U>

		if (select && Object.keys(select).length === 0) return null as any

		return result
	}

	async deleteObjects<
		K extends keyof T['types'],
		U extends keyof T['types'][K],
		W extends keyof T['types'][K],
	>({
		className,
		context,
		select,
		where,
		first,
		offset,
		order,
	}: DeleteObjectsOptions<T, K, U, W>): Promise<OutputType<T, K, W>[]> {
		const whereObject = await this._getWhereObjectWithPointerOrRelation(
			className,
			where || {},
			context,
		)

		const hook = initializeHook({
			className,
			context,
			// @ts-expect-error
			select,
			objectLoader: this._loadObjectForHooks(className, context),
			objectsLoader: this._loadObjectsForHooks(className, context),
		})

		const whereWithACLCondition = this._buildWhereWithACL(whereObject, context, 'write')

		let objectsBeforeDelete: OutputType<T, K, W>[] = []

		if (select && Object.keys(select).length > 0)
			objectsBeforeDelete = await this.getObjects({
				className,
				where,
				select,
				context,
				first,
				offset,
				order,
			})

		const resultOfBeforeDelete = await hook.runOnMultipleObjects({
			operationType: OperationType.BeforeDelete,
			where: whereWithACLCondition,
		})

		await this.adapter.deleteObjects({
			className,
			context,
			select,
			first,
			offset,
			where: whereWithACLCondition,
			order,
		})

		await hook.runOnMultipleObjects({
			operationType: OperationType.AfterDelete,
			originalObjects: resultOfBeforeDelete.objects,
		})

		return objectsBeforeDelete
	}
}
