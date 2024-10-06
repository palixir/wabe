import type { WabeTypes } from '../..'
import { InMemoryCache } from '../../cache/InMemoryCache'
import { OperationType, initializeHook } from '../../hooks'
import type { WabeContext } from '../../server/interface'
import { notEmpty } from '../../utils/helper'
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

export class DatabaseController<T extends WabeTypes> {
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

  async createClassIfNotExist(className: string, context: WabeContext<T>) {
    return this.adapter.createClassIfNotExist(className, context)
  }

  _getPointerObject(
    className: keyof T['types'],
    fields: string[],
    context: WabeContext<T>,
  ): PointerFields {
    const realClass = context.wabe.config.schema?.classes?.find(
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
                ...(acc.pointers?.[pointerField]?.fieldsOfPointerClass || []),
                pointerFields,
              ],
            },
          },
          pointersFieldsId: acc.pointersFieldsId?.includes(pointerField)
            ? acc.pointersFieldsId
            : [...(acc.pointersFieldsId || []), pointerField],
        }
      },
      { pointers: {} } as PointerFields,
    )
  }

  _isRelationField<U extends keyof T['types']>(
    originClassName: U,
    context: WabeContext<T>,
    pointerClassName?: string,
  ) {
    if (!pointerClassName) return false

    return context.wabe.config.schema?.classes?.some(
      (c) =>
        // @ts-expect-error
        c.name.toLowerCase() === originClassName.toLowerCase() &&
        Object.values(c.fields).find(
          (field) =>
            field.type === 'Relation' &&
            // @ts-expect-error
            field.class.toLowerCase() === pointerClassName.toLowerCase(),
        ),
    )
  }

  _isPointerField<U extends keyof T['types']>(
    originClassName: U,
    context: WabeContext<T>,
    pointerClassName?: string,
  ) {
    if (!pointerClassName) return false

    return context.wabe.config.schema?.classes?.some(
      (c) =>
        // @ts-expect-error
        c.name.toLowerCase() === originClassName.toLowerCase() &&
        Object.values(c.fields).find(
          (field) =>
            field.type === 'Pointer' &&
            // @ts-expect-error
            field.class.toLowerCase() === pointerClassName.toLowerCase(),
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
    context: WabeContext<T>,
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

        // @ts-expect-error
        if (isPointer && pointerClass && objectData?.[pointerField]) {
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
  >(className: U, where: WhereType<U, K>, context: WabeContext<T>) {
    const whereKeys = Object.keys(where) as Array<keyof WhereType<U, K>>

    const realClass = context.wabe.config.schema?.classes?.find(
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

      if (field?.type !== 'Pointer' && field?.type !== 'Relation') return acc

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

  _buildWhereWithACL<U extends keyof T['types'], K extends keyof T['types'][U]>(
    where: WhereType<U, K>,
    context: WabeContext<T>,
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

  async count<U extends keyof T['types'], K extends keyof T['types'][U]>(
    params: CountOptions<U, K>,
  ) {
    return this.adapter.count(params)
  }

  async clearDatabase() {
    await this.adapter.clearDatabase()
  }

  async getObject<U extends keyof T['types'], K extends keyof T['types'][U]>({
    fields,
    className,
    context,
    skipHooks,
    id,
    where,
  }: GetObjectOptions<U, K>): Promise<OutputType<U, K>> {
    const typedFields = fields as string[]

    const { pointersFieldsId, pointers } = this._getPointerObject(
      className,
      typedFields,
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

    const fieldsWithoutPointers = typedFields.filter(
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
      className,
      context,
    ) as any
  }

  async getObjects<
    U extends keyof T['types'],
    K extends keyof T['types'][U],
    W extends keyof T['types'][U],
    X extends keyof T['types'][U],
  >({
    className,
    fields,
    context,
    where,
    skipHooks,
    first,
    offset,
    order,
  }: GetObjectsOptions<U, K, W, X>): Promise<OutputType<U, K>[]> {
    const typedFields = fields as string[]

    const { pointersFieldsId, pointers } = this._getPointerObject(
      className,
      typedFields,
      context,
    )

    const fieldsWithoutPointers = typedFields.filter(
      (field) => !field.includes('.'),
    )

    const whereWithPointer = await this._getWhereObjectWithPointerOrRelation(
      className,
      where || {},
      context,
    )

    const whereWithACLCondition = this._buildWhereWithACL(
      whereWithPointer,
      context,
      'read',
    )

    const hook = !skipHooks
      ? initializeHook({
          className,
          context,
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
      className,
      context,
      first,
      offset,
      where: whereWithACLCondition,
      fields: fieldsWithPointerFields,
      order,
    })

    objects.map((object) =>
      this.inMemoryCache.set(
        this._buildCacheKey(className, object.id, fieldsWithPointerFields),
        object,
      ),
    )

    await hook?.runOnMultipleObjects({
      operationType: OperationType.AfterRead,
      objects,
    })

    const objectsToReturn = await this.adapter.getObjects({
      className,
      context,
      first,
      offset,
      where: whereWithACLCondition,
      fields: fieldsWithPointerFields,
      order,
    })

    return Promise.all(
      objectsToReturn.map((object) =>
        this._getFinalObjectWithPointer(object, pointers, className, context),
      ),
    ) as Promise<OutputType<U, K>[]>
  }

  async createObject<
    U extends keyof T['types'],
    K extends keyof T['types'][U],
    W extends keyof T['types'][U],
  >({ className, context, data, fields }: CreateObjectOptions<U, K, W>) {
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
      // @ts-expect-error
      data: newData,
    })

    const keyCache = this._buildCacheKey(
      className,
      object.id,
      fields as string[],
    )

    this.inMemoryCache.set(keyCache, undefined)

    const res = await hook.runOnSingleObject({
      operationType: OperationType.AfterCreate,
      object,
    })

    // If there is no hook to run it returns undefined object
    if (!res.object) return object

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
    X extends keyof T['types'][U],
  >({
    data,
    fields,
    className,
    context,
    first,
    offset,
    order,
  }: CreateObjectsOptions<U, K, W, X>) {
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
          )?.newData[0],
      ),
    )

    const objects = await this.adapter.createObjects({
      className,
      fields,
      context,
      data: arrayOfComputedData,
      first,
      offset,
      order,
    })

    const objectsId = objects.map((object) => object.id)

    for (const id of objectsId) {
      const keyCache = this._buildCacheKey(className, id, fields as string[])

      this.inMemoryCache.set(keyCache, undefined)
    }

    const res = await Promise.all(
      hooks.map((hook) =>
        hook.runOnMultipleObjects({
          operationType: OperationType.AfterCreate,
          objects,
        }),
      ),
    )

    // If there is no hook to run it returns undefined object
    if (res.filter((hook) => hook.objects.length > 0).length === 0)
      return objects

    const objectsToReturn = await this.getObjects({
      className,
      context,
      fields,
      where: { id: { in: objectsId } },
      skipHooks: true,
      first,
      offset,
      order,
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

    const whereWithACLCondition = this._buildWhereWithACL({}, context, 'write')

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

    const res = await hook.runOnSingleObject({
      operationType: OperationType.AfterUpdate,
      object,
    })

    if (!res.object) return object

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
    X extends keyof T['types'][U],
  >({
    className,
    where,
    context,
    fields,
    data,
    first,
    offset,
    order,
  }: UpdateObjectsOptions<U, K, W, X>) {
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
      first,
      offset,
      order,
    })

    const objectsId = objects.map((object) => object.id)

    for (const id of objectsId) {
      const keyCache = this._buildCacheKey(className, id, fields as string[])

      this.inMemoryCache.set(keyCache, undefined)
    }

    const res = await hook.runOnMultipleObjects({
      operationType: OperationType.AfterUpdate,
      objects,
    })

    // If there is no hook to run it returns undefined object
    if (res.objects.length === 0) return objects

    const objectsToReturn = await this.getObjects({
      className,
      context,
      fields,
      where: { id: { in: objectsId } },
      skipHooks: true,
      first,
      offset,
      order,
    })

    return objectsToReturn
  }

  async deleteObject<
    U extends keyof T['types'],
    K extends keyof T['types'][U],
    W extends keyof T['types'][U],
  >({ context, className, id, fields }: DeleteObjectOptions<U, K, W>) {
    const hook = initializeHook({
      className,
      context,
    })

    const whereWithACLCondition = this._buildWhereWithACL({}, context, 'write')

    const objectBeforeDelete = await this.getObject({
      className,
      fields,
      id,
      context,
    })

    const { object } = await hook.runOnSingleObject({
      operationType: OperationType.BeforeDelete,
      id,
    })

    await this.adapter.deleteObject({
      className,
      context,
      fields,
      id,
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
    X extends keyof T['types'][U],
  >({
    className,
    context,
    fields,
    where,
    first,
    offset,
    order,
  }: DeleteObjectsOptions<U, K, W, X>) {
    const whereObject = await this._getWhereObjectWithPointerOrRelation(
      className,
      where || {},
      context,
    )

    const hook = initializeHook({
      className,
      context,
    })

    const whereWithACLCondition = this._buildWhereWithACL(
      whereObject,
      context,
      'write',
    )

    const objectBeforeDelete = await this.getObjects({
      className,
      where,
      fields,
      context,
      first,
      offset,
      order,
    })

    const { objects } = await hook.runOnMultipleObjects({
      operationType: OperationType.BeforeDelete,
      where: whereWithACLCondition,
    })

    await this.adapter.deleteObjects({
      className,
      context,
      fields,
      first,
      offset,
      where: whereWithACLCondition,
      order,
    })

    await hook.runOnMultipleObjects({
      operationType: OperationType.AfterDelete,
      objects,
    })

    return objectBeforeDelete
  }
}
