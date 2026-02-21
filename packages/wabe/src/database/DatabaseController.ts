import { selectFieldsWithoutPrivateFields } from 'src/utils/helper'
import type { WabeTypes } from '../..'
import { initializeHook, OperationType } from '../hooks'
import type { SchemaInterface } from '../schema'
import type { WabeContext } from '../server/interface'
import { contextWithRoot, notEmpty } from '../utils/export'
import type { DevWabeTypes } from '../utils/helper'
import {
	type CountOptions,
	type CreateObjectOptions,
	type CreateObjectsOptions,
	type DatabaseAdapter,
	type DeleteObjectOptions,
	type DeleteObjectsOptions,
	type GetObjectOptions,
	type GetObjectsOptions,
	type OutputType,
	type UpdateObjectOptions,
	type UpdateObjectsOptions,
	type WhereType,
} from './interface'

export type Select = Record<string, boolean>
type SelectWithObject = Record<string, object | boolean>

const scalarWhereOperators = new Set([
	'equalTo',
	'notEqualTo',
	'greaterThan',
	'lessThan',
	'greaterThanOrEqualTo',
	'lessThanOrEqualTo',
	'in',
	'notIn',
	'contains',
	'notContains',
	'exists',
])

const isScalarWhereFilter = (value: unknown): boolean =>
	value !== null &&
	typeof value === 'object' &&
	!Array.isArray(value) &&
	Object.keys(value).some((key) => scalarWhereOperators.has(key))

type RuntimeVirtualField = {
	type: 'Virtual'
	dependsOn: string[]
	callback: (object: Record<string, unknown>) => unknown
}

const isVirtualField = (field: unknown): field is RuntimeVirtualField => {
	if (!field || typeof field !== 'object') return false

	if (!('type' in field) || field.type !== 'Virtual') return false

	return true
}

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

	_getVirtualFieldsForClass(className: keyof T['types'], context: WabeContext<T>) {
		const currentClass = this._getClass(className, context)

		if (!currentClass) return {}

		const virtualFields: Record<string, RuntimeVirtualField> = {}

		for (const [fieldName, fieldDefinition] of Object.entries(currentClass.fields)) {
			if (!isVirtualField(fieldDefinition)) continue

			virtualFields[fieldName] = fieldDefinition
		}

		return virtualFields
	}

	_buildReadSelects({
		className,
		context,
		selectWithoutPointers,
	}: {
		className: keyof T['types']
		context: WabeContext<T>
		selectWithoutPointers: Select
	}) {
		const virtualFieldsByName = this._getVirtualFieldsForClass(className, context)
		const requestedVirtualFields: string[] = []

		const userSelect: Select = {}

		for (const [fieldName, selected] of Object.entries(selectWithoutPointers)) {
			if (!selected) continue

			const virtualField = virtualFieldsByName[fieldName]

			if (virtualField) {
				requestedVirtualFields.push(fieldName)
				continue
			}

			userSelect[fieldName] = true
		}

		const adapterSelect: Select = { ...userSelect }

		for (const virtualFieldName of requestedVirtualFields) {
			const virtualField = virtualFieldsByName[virtualFieldName]

			if (!virtualField) continue

			for (const dependencyField of virtualField.dependsOn) {
				const dependencyName = String(dependencyField)

				// Virtual dependencies are only useful for computation and must never reach adapters.
				if (virtualFieldsByName[dependencyName]) continue

				adapterSelect[dependencyName] = true
			}
		}

		return {
			userSelect,
			adapterSelect,
		}
	}

	_buildHookReadSelect({
		className,
		context,
		userSelect,
		selectWithoutPointers,
	}: {
		className: keyof T['types']
		context: WabeContext<T>
		userSelect: Select
		selectWithoutPointers: Select
	}): Select {
		const selectedVirtualFields = Object.keys(this._getVirtualFieldsForClass(className, context))
			.filter((fieldName) => !!selectWithoutPointers[fieldName])
			.map((fieldName) => [fieldName, true])

		return {
			...userSelect,
			...Object.fromEntries(selectedVirtualFields),
		}
	}

	_initializeReadHook<K extends keyof T['types']>({
		className,
		context,
		userSelect,
		selectWithoutPointers,
		_skipHooks,
	}: {
		className: K
		context: WabeContext<T>
		userSelect: Select
		selectWithoutPointers: Select
		_skipHooks?: boolean
	}) {
		if (_skipHooks) return undefined

		return initializeHook({
			className,
			context,
			select: this._buildHookReadSelect({
				className,
				context,
				userSelect,
				selectWithoutPointers,
			}),
			objectLoader: this._loadObjectForHooks(className, context),
			objectsLoader: this._loadObjectsForHooks(className, context),
		})
	}

	_buildSelectWithPointers({
		adapterSelect,
		pointers,
	}: {
		adapterSelect: Select
		pointers: Record<string, { className: string; select: Select }>
	}) {
		return Object.keys(pointers).reduce(
			(acc, fieldName) => {
				acc[fieldName] = true
				return acc
			},
			{ ...adapterSelect },
		)
	}

	_isEmptySelect(select?: Record<string, unknown>): boolean {
		return !!select && Object.keys(select).length === 0
	}

	_projectObjectForUserSelect({
		object,
		select,
	}: {
		object: Record<string, any> | null | undefined
		select?: SelectWithObject
	}): any {
		if (!object) return object
		if (!select) return object

		const projectedObject: Record<string, any> = {}

		for (const [fieldName, selected] of Object.entries(select)) {
			if (!selected) continue
			if (!(fieldName in object)) continue

			projectedObject[fieldName] = object[fieldName]
		}

		return projectedObject
	}

	_stripVirtualFieldsFromPayload({
		className,
		context,
		payload,
	}: {
		className: keyof T['types']
		context: WabeContext<T>
		payload: unknown
	}): any {
		if (!payload || typeof payload !== 'object') return {}

		const virtualFields = this._getVirtualFieldsForClass(className, context)

		if (Object.keys(virtualFields).length === 0) return payload

		const filteredPayload: Record<string, unknown> = {}

		for (const [fieldName, value] of Object.entries(payload)) {
			if (virtualFields[fieldName]) continue

			filteredPayload[fieldName] = value
		}

		return filteredPayload
	}

	_stripVirtualFieldsFromSchema(schema: SchemaInterface<T>): SchemaInterface<T> {
		const classes = schema.classes?.map((classDefinition) => {
			const filteredFieldEntries = Object.entries(classDefinition.fields).filter(
				([_fieldName, fieldDefinition]) => !isVirtualField(fieldDefinition),
			)
			const filteredFields = Object.fromEntries(filteredFieldEntries)

			const allowedFieldNames = new Set(Object.keys(filteredFields))

			const filteredIndexes = classDefinition.indexes?.filter((index) =>
				allowedFieldNames.has(index.field),
			)

			return {
				...classDefinition,
				fields: filteredFields,
				indexes: filteredIndexes,
			}
		})

		return {
			...schema,
			classes,
		}
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

			const relationValue = where[typedWhereKey]

			// Relation where can already be transformed (e.g. { in: [...] })
			// when reused across count/getObjects; keep scalar filters unchanged.
			if (field?.type === 'Relation' && isScalarWhereFilter(relationValue)) {
				return {
					...currentAcc,
					[typedWhereKey]: relationValue,
				}
			}

			// For Relation: unwrap have/isEmpty structure
			let defaultWhere = relationValue
			if (field?.type === 'Relation' && relationValue) {
				// @ts-expect-error
				if (relationValue.isEmpty !== undefined) {
					// In storage, an empty relation can be either [] or an absent field.
					// Model both cases explicitly so the filter behaves consistently.
					// @ts-expect-error
					return relationValue.isEmpty === true
						? {
								...currentAcc,
								OR: [{ [typedWhereKey]: { equalTo: [] } }, { [typedWhereKey]: { exists: false } }],
							}
						: {
								...currentAcc,
								AND: [
									{ [typedWhereKey]: { exists: true } },
									{ [typedWhereKey]: { notEqualTo: [] } },
								],
							}
				}

				// @ts-expect-error
				if (relationValue.have)
					// @ts-expect-error
					defaultWhere = relationValue.have as typeof defaultWhere
			}

			const objects = await this.getObjects({
				className: fieldTargetClass,
				// @ts-expect-error
				select: { id: true },
				// @ts-expect-error
				where: defaultWhere,
				context,
			})
			// When no objects match, use impossible condition to return no results
			const relationWhere =
				objects.length > 0
					? {
							in: objects.map((object) => object?.id).filter(notEmpty),
						}
					: { equalTo: '__no_match__' }
			return {
				...currentAcc,
				[typedWhereKey]: relationWhere,
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

		const aclNullCondition = {
			acl: { equalTo: null },
		}
		const aclUserCondition = userId
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
			: undefined
		const aclRoleCondition = roleId
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
			: undefined

		const aclForUnauthenticated = !userId ? aclNullCondition : undefined
		const aclForUserOrRole =
			userId || roleId
				? {
						OR: [aclNullCondition, aclUserCondition, aclRoleCondition].filter(notEmpty),
					}
				: undefined

		return {
			AND: [{ ...where }, aclForUnauthenticated, aclForUserOrRole].filter(notEmpty),
		} as WhereType<T, K>
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

	_getRelationSelectWithoutTotalCount(currentSelect?: Select): Select {
		const selectWithoutTotalCount = currentSelect
			? Object.entries(currentSelect).reduce((acc, [key, value]) => {
					if (key === 'totalCount' || key === '_args') return acc
					return {
						...acc,
						[key]: value,
					}
				}, {})
			: undefined

		return selectWithoutTotalCount && Object.keys(selectWithoutTotalCount).length > 0
			? (selectWithoutTotalCount as Select)
			: { id: true }
	}

	async _resolvePointerField({
		currentClassName,
		object,
		pointerField,
		currentSelect,
		context,
		_skipHooks,
	}: {
		currentClassName: string
		object: Record<string, any>
		pointerField: string
		currentSelect?: Select
		context: WabeContext<any>
		_skipHooks?: boolean
	}) {
		if (!object[pointerField]) return null

		return this.getObject({
			className: currentClassName,
			id: object[pointerField],
			context,
			// @ts-expect-error
			select: currentSelect,
			_skipHooks,
		})
	}

	async _resolveRelationField({
		currentClassName,
		object,
		pointerField,
		currentSelect,
		context,
		_skipHooks,
	}: {
		currentClassName: string
		object: Record<string, any>
		pointerField: string
		currentSelect?: Select
		context: WabeContext<any>
		_skipHooks?: boolean
	}) {
		const relationIds = object[pointerField]
		if (!relationIds) return undefined

		const selectWithoutTotalCount = this._getRelationSelectWithoutTotalCount(currentSelect)
		const args = (currentSelect as any)?._args || {}

		const where: any = args.where
			? { AND: [{ id: { in: relationIds } }, args.where] }
			: { id: { in: relationIds } }

		const order: any = args.order?.reduce(
			(acc: any, currentOrder: any) => {
				// In some AST parsing, enums may come as strings like "age_DESC"
				// or as objects depending on how valueFromASTUntyped processed it.
				if (typeof currentOrder === 'string') {
					const lastUnderscore = currentOrder.lastIndexOf('_')
					if (lastUnderscore !== -1) {
						const field = currentOrder.slice(0, lastUnderscore)
						const direction = currentOrder.slice(lastUnderscore + 1)
						return { ...acc, [field]: direction }
					}
				} else {
					const result = Object.entries(currentOrder)[0]
					if (result && result[0] && result[1]) {
						return { ...acc, [result[0]]: result[1] }
					}
				}
				return acc
			},
			{} as Record<string, 'ASC' | 'DESC'>,
		)

		const relationObjects = await this.getObjects({
			className: currentClassName,
			select: selectWithoutTotalCount as any,
			where,
			offset: args.offset,
			first: args.first,
			order,
			context,
			_skipHooks,
		})

		if (!context.isGraphQLCall) return relationObjects

		const shouldCount =
			args.offset !== undefined || args.first !== undefined || args.where !== undefined

		const totalCount = shouldCount
			? await this.count({
					className: currentClassName,
					where,
					context,
				})
			: relationObjects.length

		return {
			totalCount,
			edges: relationObjects.map((object: any) => ({
				node: object,
			})),
		}
	}

	_getFinalObjectWithPointerAndRelation({
		pointers,
		context,
		originClassName,
		object,
		_skipHooks,
	}: {
		originClassName: keyof T['types']
		pointers: Record<string, { className: string; select: Select }>
		context: WabeContext<any>
		object: Record<string, any> | null | undefined
		_skipHooks?: boolean
	}) {
		if (!object) return Promise.resolve({})

		return Object.entries(pointers).reduce(
			async (acc, [pointerField, { className: currentClassName, select: currentSelect }]) => {
				const accObject = await acc

				const isPointer = this._isFieldOfType(
					String(originClassName),
					pointerField,
					'Pointer',
					context,
					currentClassName,
				)

				if (isPointer) {
					return {
						...accObject,
						[pointerField]: await this._resolvePointerField({
							currentClassName,
							object,
							pointerField,
							currentSelect,
							context,
							_skipHooks,
						}),
					}
				}

				const isRelation = this._isFieldOfType(
					String(originClassName),
					pointerField,
					'Relation',
					context,
					currentClassName,
				)

				if (!isRelation) return accObject

				const relationValue = await this._resolveRelationField({
					currentClassName,
					object,
					pointerField,
					currentSelect,
					context,
					_skipHooks,
				})

				if (relationValue === undefined) return accObject

				return {
					...accObject,
					[pointerField]: relationValue,
				}
			},
			Promise.resolve({} as Record<string, any>),
		)
	}

	async close() {
		await this.adapter.close()
	}

	createClassIfNotExist(className: string, schema: SchemaInterface<T>): Promise<any> {
		return this.adapter.createClassIfNotExist(className, this._stripVirtualFieldsFromSchema(schema))
	}

	initializeDatabase(schema: SchemaInterface<T>): Promise<void> {
		return this.adapter.initializeDatabase(this._stripVirtualFieldsFromSchema(schema))
	}

	async count<K extends keyof T['types']>({
		className,
		context,
		where,
	}: CountOptions<T, K>): Promise<number> {
		const whereWithPointer = await this._getWhereObjectWithPointerOrRelation(
			className,
			where || {},
			context,
		)

		const whereWithACLCondition = this._buildWhereWithACL(whereWithPointer, context, 'read')

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
		const { userSelect, adapterSelect } = this._buildReadSelects({
			className,
			context,
			selectWithoutPointers,
		})

		const hook = this._initializeReadHook({
			className,
			context,
			userSelect,
			selectWithoutPointers,
			_skipHooks,
		})

		await hook?.runOnSingleObject({
			operationType: OperationType.BeforeRead,
			id,
		})

		const whereWithACLCondition = this._buildWhereWithACL(where || {}, context, 'read')

		const selectWithPointersAndRelationsToGetId = this._buildSelectWithPointers({
			adapterSelect,
			pointers,
		})

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
				originClassName: className,
				pointers,
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
		const objectAfterHooks = afterReadResult?.object || finalObject
		const objectProjectedForUser = this._projectObjectForUserSelect({
			object: objectAfterHooks,
			select: select as SelectWithObject,
		})

		return objectProjectedForUser
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
		const { userSelect, adapterSelect } = this._buildReadSelects({
			className,
			context,
			selectWithoutPointers,
		})

		const whereWithPointer = await this._getWhereObjectWithPointerOrRelation(
			className,
			where || {},
			context,
		)

		const whereWithACLCondition = this._buildWhereWithACL(whereWithPointer || {}, context, 'read')

		const selectWithPointersAndRelationsToGetId = this._buildSelectWithPointers({
			adapterSelect,
			pointers,
		})

		const hook = this._initializeReadHook({
			className,
			context,
			userSelect,
			selectWithoutPointers,
			_skipHooks,
		})

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
						object,
						context,
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
		const objectsAfterHooks = afterReadResults?.objects || objectsWithPointers
		const projectedObjects = objectsAfterHooks.map((object) =>
			this._projectObjectForUserSelect({
				object,
				select: select as SelectWithObject,
			}),
		)

		// Projection keeps only user-requested top-level fields, including virtual fields.
		return projectedObjects
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
				const payload = this._stripVirtualFieldsFromPayload({
					className,
					context,
					payload: newData || data,
				})

				const res = await this.adapter.createObject({
					className,
					context,
					select,
					data: payload,
				})

				return { id: res.id }
			},
		})

		const res = result as { id: string }

		if (this._isEmptySelect(select as Record<string, unknown>)) return null

		const selectWithoutPrivateFields = select ? selectFieldsWithoutPrivateFields(select) : undefined

		return this.getObject({
			className,
			context: contextWithRoot(context),
			select: selectWithoutPrivateFields,
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
			data: arrayOfComputedData.map((payload) =>
				this._stripVirtualFieldsFromPayload({
					className,
					context,
					payload,
				}),
			),
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

		if (this._isEmptySelect(select as Record<string, unknown>)) return []

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
			const payload = this._stripVirtualFieldsFromPayload({
				className,
				context,
				payload: data,
			})

			return this.adapter.updateObject({
				className,
				select,
				id,
				context,
				data: payload,
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
				const payload = this._stripVirtualFieldsFromPayload({
					className,
					context,
					payload: newData || data,
				})

				await this.adapter.updateObject({
					className,
					select,
					id,
					context,
					data: payload,
					where: whereWithACLCondition,
				})

				return { id }
			},
		})

		if (this._isEmptySelect(select as Record<string, unknown>)) return null

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
			data: this._stripVirtualFieldsFromPayload({
				className,
				context,
				payload: resultsAfterBeforeUpdate?.newData[0] || data || {},
			}),
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

		if (this._isEmptySelect(select as Record<string, unknown>)) return []

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

		if (this._isEmptySelect(select as Record<string, unknown>)) return null as any

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
