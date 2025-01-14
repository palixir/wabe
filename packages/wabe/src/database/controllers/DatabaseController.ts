import type { WabeTypes } from '../..'
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
  public adapter: DatabaseAdapter<T>

  constructor(adapter: DatabaseAdapter<T>) {
    this.adapter = adapter
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

  _isRelationField<K extends keyof T['types']>(
    originClassName: K,
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

  _isPointerField<K extends keyof T['types']>(
    originClassName: K,
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
    K extends keyof T['types'],
    U extends keyof T['types'][K],
  >(
    objectData: OutputType<T, K, U> | null,
    pointersObject: PointerObject,
    originClassName: K,
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

  async _getWhereObjectWithPointerOrRelation<U extends keyof T['types']>(
    className: U,
    where: WhereType<T, U>,
    context: WabeContext<T>,
  ) {
    const whereKeys = Object.keys(where) as Array<keyof WhereType<T, U>>

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

      const defaultWhere = where[typedWhereKey]

      const objects = await this.getObjects({
        className: fieldTargetClass,
        fields: ['id'],
        // @ts-expect-error
        where: defaultWhere,
        context,
      })

      return {
        ...acc,
        // If we don't found any object we just execute the query with the default where
        // Without any transformation for pointer or relation
        [typedWhereKey]: {
          in: objects.map((object) => object?.id).filter(notEmpty),
        },
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

  connect(): Promise<any> {
    return this.adapter.connect()
  }

  close(): Promise<any> {
    return this.adapter.close()
  }

  createClassIfNotExist(
    className: string,
    context: WabeContext<T>,
  ): Promise<any> {
    return this.adapter.createClassIfNotExist(className, context)
  }

  count<K extends keyof T['types']>(
    params: CountOptions<T, K>,
  ): Promise<number> {
    return this.adapter.count(params)
  }

  async clearDatabase(): Promise<void> {
    await this.adapter.clearDatabase()
  }

  async getObject<K extends keyof T['types'], U extends keyof T['types'][K]>({
    fields,
    className,
    context,
    skipHooks,
    id,
    where,
  }: GetObjectOptions<T, K, U>): Promise<OutputType<T, K, U>> {
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

    // For read operation we don't need to get all the objects between, because the data is not mutated
    // We should only run before and after hooks, and then get the data with request to only return after
    // possible mutated data in the hooks
    // A little tricky but logic
    //
    await hook?.runOnSingleObject({
      operationType: OperationType.AfterRead,
      id,
    })

    const objectToReturn = await this.adapter.getObject({
      className,
      id,
      context,
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
    K extends keyof T['types'],
    U extends keyof T['types'][K],
    W extends keyof T['types'][K],
  >({
    className,
    fields,
    context,
    where,
    skipHooks,
    first,
    offset,
    order,
  }: GetObjectsOptions<T, K, U, W>): Promise<OutputType<T, K, W>[]> {
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

    // For read operation we don't need to get all the objects between, because the data is not mutated
    // We should only run before and after hooks, and then get the data with request to only return after
    // possible mutated data in the hooks
    // A little tricky but logic

    await hook?.runOnMultipleObjects({
      operationType: OperationType.AfterRead,
      where: whereWithACLCondition,
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
    ) as Promise<OutputType<T, K, W>[]>
  }

  async createObject<
    K extends keyof T['types'],
    U extends keyof T['types'][K],
    W extends keyof T['types'][K],
  >({
    className,
    context,
    data,
    fields,
  }: CreateObjectOptions<T, K, U, W>): Promise<OutputType<T, K, W>> {
    // Here data.file is null but should not be
    const hook = initializeHook({
      className,
      context,
      newData: data,
    })

    const { newData } = await hook.runOnSingleObject({
      operationType: OperationType.BeforeCreate,
    })

    const { id } = await this.adapter.createObject({
      className,
      context,
      fields,
      data: newData,
    })

    await hook.runOnSingleObject({
      operationType: OperationType.AfterCreate,
      id,
    })

    if (fields.length === 0) return null

    return this.getObject({
      className,
      context: {
        ...context,
        // Because if you create an object, exceptionnaly you can read it after creation
        isRoot: true,
      },
      fields,
      id,
      skipHooks: true,
    })
  }

  async createObjects<
    K extends keyof T['types'],
    U extends keyof T['types'][K],
    W extends keyof T['types'][K],
    X extends keyof T['types'][K],
  >({
    data,
    fields,
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

    const listOfIds = await this.adapter.createObjects({
      className,
      fields,
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

    if (fields.length === 0) return []

    return this.getObjects({
      className,
      context,
      fields,
      // @ts-expect-error
      where: { id: { in: ids } },
      skipHooks: true,
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
    fields,
  }: UpdateObjectOptions<T, K, U, W>): Promise<OutputType<T, K, W>> {
    const hook = initializeHook({
      className,
      context,
      newData: data,
    })

    const { newData, object } = await hook.runOnSingleObject({
      operationType: OperationType.BeforeUpdate,
      id,
    })

    const whereWithACLCondition = this._buildWhereWithACL({}, context, 'write')

    await this.adapter.updateObject({
      className,
      fields,
      id,
      context,
      data: newData,
      where: whereWithACLCondition,
    })

    await hook.runOnSingleObject({
      operationType: OperationType.AfterUpdate,
      id,
      originalObject: object,
    })

    if (fields.length === 0) return null

    return this.getObject({
      className,
      context,
      fields,
      id,
      skipHooks: true,
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
    fields,
    data,
    first,
    offset,
    order,
  }: UpdateObjectsOptions<T, K, U, W, X>): Promise<OutputType<T, K, W>[]> {
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

    const { newData, objects: objectsAfterBeforeUpdate } =
      await hook.runOnMultipleObjects({
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

    const objectsId = objects.map((object) => object?.id).filter(notEmpty)

    await hook.runOnMultipleObjects({
      operationType: OperationType.AfterUpdate,
      ids: objectsId,
      originalObjects: objectsAfterBeforeUpdate,
    })

    if (fields.length === 0) return []

    return this.getObjects({
      className,
      context,
      fields,
      // @ts-expect-error
      where: { id: { in: objectsId } },
      skipHooks: true,
      first,
      offset,
      order,
    })
  }

  async deleteObject<
    K extends keyof T['types'],
    U extends keyof T['types'][K],
  >({
    context,
    className,
    id,
    fields,
  }: DeleteObjectOptions<T, K, U>): Promise<OutputType<T, K, U>> {
    const hook = initializeHook({
      className,
      context,
    })

    const whereWithACLCondition = this._buildWhereWithACL({}, context, 'write')

    let objectBeforeDelete = null

    if (fields.length > 0)
      objectBeforeDelete = await this.getObject({
        className,
        fields,
        id,
        context,
      })

    const resultOfBeforeDelete = await hook.runOnSingleObject({
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
      originalObject: resultOfBeforeDelete.object,
    })

    return objectBeforeDelete
  }

  async deleteObjects<
    K extends keyof T['types'],
    U extends keyof T['types'][K],
    W extends keyof T['types'][K],
  >({
    className,
    context,
    fields,
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
    })

    const whereWithACLCondition = this._buildWhereWithACL(
      whereObject,
      context,
      'write',
    )

    let objectsBeforeDelete: OutputType<T, K, W>[] = []

    if (fields.length > 0)
      objectsBeforeDelete = await this.getObjects({
        className,
        where,
        fields,
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
      fields,
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
