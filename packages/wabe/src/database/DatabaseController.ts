import type { WabeTypes } from '../..'
import { OperationType, initializeHook } from '../hooks'
import type { SchemaInterface } from '../schema'
import type { WabeContext } from '../server/interface'
import { contextWithRoot } from '../utils/export'
import { notEmpty } from '../utils/export'
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

  _getSelectMinusPointersAndRelations({
    className,
    context,
    select,
  }: {
    className: keyof T['types']
    context: WabeContext<T>
    select?: SelectWithObject
  }): {
    // We associated the fieldName with a className and a select object
    pointers: Record<string, { className: string; select: Select }>
    selectWithoutPointers: Select
  } {
    const realClass = context.wabe.config.schema?.classes?.find(
      // @ts-expect-error
      (c) => c.name.toLowerCase() === className.toLowerCase(),
    )

    if (!realClass) throw new Error('Class not found in schema')

    if (!select) {
      return Object.entries(realClass.fields).reduce(
        (acc, [fieldName, value]) => {
          // We don't want to select the acl field
          if (fieldName === 'acl') return acc

          if (value.type === 'Pointer' || value.type === 'Relation') {
            const realPointerClass = context.wabe.config.schema?.classes?.find(
              // @ts-expect-error
              (c) => c.name.toLowerCase() === value.class.toLowerCase(),
            )

            if (!realPointerClass) return acc

            const newSelect = Object.entries(realPointerClass.fields).reduce(
              (acc, [fieldName, field]) => {
                if (field.type === 'Relation' || field.type === 'Pointer')
                  return acc

                return {
                  ...acc,
                  [fieldName]: true,
                }
              },
              {},
            )

            return {
              ...acc,
              pointers: {
                ...acc.pointers,
                [fieldName]: {
                  // @ts-expect-error
                  className: value.class,
                  select: newSelect,
                },
              },
            }
          }

          return {
            ...acc,
            selectWithoutPointers: {
              ...acc.selectWithoutPointers,
              [fieldName]: true,
            },
          }
        },
        {
          pointers: {},
          selectWithoutPointers: {},
        },
      )
    }

    const pointerOrRelationFields = Object.keys(realClass.fields).filter(
      (fieldName) =>
        realClass.fields[fieldName]?.type === 'Pointer' ||
        realClass.fields[fieldName]?.type === 'Relation',
    )

    return Object.entries(select).reduce(
      (acc, [fieldName, value]) => {
        // If not pointer or relation
        if (!pointerOrRelationFields.includes(fieldName))
          return {
            ...acc,
            selectWithoutPointers: {
              ...acc.selectWithoutPointers,
              [fieldName]: true,
            },
          }

        // @ts-expect-error
        const classOfPointerOrRelation = realClass.fields[fieldName].class

        // Pointer or relation
        return {
          ...acc,
          pointers: {
            ...acc.pointers,
            [fieldName]: {
              className: classOfPointerOrRelation,
              // If we set value to true we want all the fields of the pointer if we
              // set an object we just want some fields
              select: value === true ? undefined : value,
            },
          },
        }
      },
      { pointers: {}, selectWithoutPointers: {} },
    )
  }

  _isRelationField({
    pointerField,
    currentClassName,
    context,
    originClassName,
  }: {
    pointerField: string
    originClassName: string
    context: WabeContext<T>
    currentClassName?: string
  }) {
    if (!currentClassName) return false

    return context.wabe.config.schema?.classes?.some(
      (c) =>
        c.name.toLowerCase() === originClassName.toLowerCase() &&
        Object.entries(c.fields).find(
          ([fieldName, field]) =>
            fieldName === pointerField &&
            field.type === 'Relation' &&
            // @ts-expect-error
            field.class.toLowerCase() === currentClassName.toLowerCase(),
        ),
    )
  }

  _isPointerField({
    pointerField,
    currentClassName,
    context,
    originClassName,
  }: {
    originClassName: string
    context: WabeContext<T>
    pointerField: string
    currentClassName?: string
  }) {
    if (!currentClassName) return false

    return context.wabe.config.schema?.classes?.some(
      (c) =>
        c.name.toLowerCase() === originClassName.toLowerCase() &&
        Object.entries(c.fields).find(
          ([fieldName, field]) =>
            fieldName === pointerField &&
            field.type === 'Pointer' &&
            // @ts-expect-error
            field.class.toLowerCase() === currentClassName.toLowerCase(),
        ),
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
                              notContains: { userId },
                            },
                          },
                        },
                        {
                          acl: {
                            roles: {
                              contains: { roleId, [operation]: true },
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

  _getFinalObjectWithPointerAndRelation({
    pointers,
    context,
    originClassName,
    object,
    isGraphQLCall,
    skipHooks,
  }: {
    originClassName: string
    pointers: Record<string, { className: string; select: Select }>
    context: WabeContext<any>
    object: Record<string, any>
    isGraphQLCall?: boolean
    skipHooks?: boolean
  }) {
    return Object.entries(pointers).reduce(
      async (
        acc,
        [pointerField, { className: currentClassName, select: currentSelect }],
      ) => {
        const accObject = await acc

        const isPointer = this._isPointerField({
          originClassName,
          context,
          currentClassName,
          pointerField,
        })

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
            skipHooks,
          })

          return {
            ...accObject,
            [pointerField]: objectOfPointerClass,
          }
        }

        const isRelation = this._isRelationField({
          originClassName,
          context,
          currentClassName,
          pointerField,
        })

        if (isRelation && object[pointerField]) {
          const selectWithoutTotalCount = Object.entries(
            currentSelect || {},
          ).reduce(
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
            skipHooks,
          })

          return {
            ...accObject,
            [pointerField]: isGraphQLCall
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

  createClassIfNotExist(
    className: string,
    schema: SchemaInterface<T>,
  ): Promise<any> {
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
    const hook = initializeHook({
      className,
      context,
      select: {},
    })

    await hook?.runOnSingleObject({
      operationType: OperationType.BeforeRead,
    })

    const count = await this.adapter.count({ className, context, where })

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
    skipHooks,
    id,
    where,
    isGraphQLCall = false,
  }: GetObjectOptions<T, K, U>): Promise<OutputType<T, K, U>> {
    const { pointers, selectWithoutPointers } =
      this._getSelectMinusPointersAndRelations({
        className,
        context,
        select: select as SelectWithObject,
      })

    const hook = !skipHooks
      ? initializeHook({
          className,
          context,
          select: selectWithoutPointers,
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

    const selectWithPointersAndRelationsToGetId = Object.keys(pointers).reduce(
      (acc, fieldName) => {
        acc[fieldName] = true

        return acc
      },
      selectWithoutPointers,
    )

    // For read operation we don't need to get all the objects between, because the data is not mutated
    // We should only run before and after hooks, and then get the data with request to only return after
    // possible mutated data in the hooks
    // A little tricky but logic
    await hook?.runOnSingleObject({
      operationType: OperationType.AfterRead,
      id,
    })

    const objectToReturn = await this.adapter.getObject({
      className,
      id,
      context: contextWithRoot(context),
      // @ts-expect-error
      select: !select ? undefined : selectWithPointersAndRelationsToGetId,
      where: whereWithACLCondition,
    })

    // @ts-expect-error
    return {
      ...objectToReturn,
      ...(await this._getFinalObjectWithPointerAndRelation({
        context,
        // @ts-expect-error
        originClassName: className,
        pointers,
        // @ts-expect-error
        object: objectToReturn,
        isGraphQLCall,
        skipHooks,
      })),
    }
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
    skipHooks,
    first,
    offset,
    order,
    isGraphQLCall = false,
  }: GetObjectsOptions<T, K, U, W>): Promise<OutputType<T, K, W>[]> {
    const { pointers, selectWithoutPointers } =
      this._getSelectMinusPointersAndRelations({
        className,
        context,
        select: select as SelectWithObject,
      })

    const whereWithPointer = await this._getWhereObjectWithPointerOrRelation(
      className,
      where || {},
      context,
    )

    const whereWithACLCondition = this._buildWhereWithACL(
      whereWithPointer || {},
      context,
      'read',
    )

    const selectWithPointersAndRelationsToGetId = Object.keys(pointers).reduce(
      (acc, fieldName) => {
        acc[fieldName] = true

        return acc
      },
      selectWithoutPointers,
    )

    const hook = !skipHooks
      ? initializeHook({
          className,
          select: selectWithoutPointers,
          context,
        })
      : undefined

    await hook?.runOnMultipleObjects({
      operationType: OperationType.BeforeRead,
      where: whereWithACLCondition,
    })

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
      context: contextWithRoot(context),
      first,
      offset,
      where: whereWithACLCondition,
      // @ts-expect-error
      select: !select ? undefined : selectWithPointersAndRelationsToGetId,
      order,
    })

    return Promise.all(
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
            isGraphQLCall,
            skipHooks,
          })),
        }
      }),
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
    select,
    isGraphQLCall = false,
  }: CreateObjectOptions<T, K, U, W>): Promise<OutputType<T, K, W>> {
    // Here data.file is null but should not be
    const hook = initializeHook({
      className,
      context,
      newData: data,
      // @ts-expect-error
      select,
    })

    const { newData } = await hook.runOnSingleObject({
      operationType: OperationType.BeforeCreate,
    })

    const { id } = await this.adapter.createObject({
      className,
      context,
      select,
      data: newData || data,
    })

    await hook.runOnSingleObject({
      operationType: OperationType.AfterCreate,
      id,
    })

    if (select && Object.keys(select).length === 0) return null

    return this.getObject({
      className,
      context: contextWithRoot(context),
      select,
      id,
      // Because if you create an object, exceptionnaly you can read it after creation
      skipHooks: true,
      isGraphQLCall,
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
    isGraphQLCall = false,
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
      context,
      select,
      // @ts-expect-error
      where: { id: { in: ids } },
      // Because if you create an object, exceptionnaly you can read it after creation
      skipHooks: true,
      first,
      offset,
      order,
      isGraphQLCall,
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
    skipHooks,
    isGraphQLCall = false,
  }: UpdateObjectOptions<T, K, U, W>): Promise<OutputType<T, K, W>> {
    const hook = !skipHooks
      ? initializeHook({
          className,
          context,
          newData: data,
          // @ts-expect-error
          select,
        })
      : undefined

    const resultsAfterBeforeUpdate = await hook?.runOnSingleObject({
      operationType: OperationType.BeforeUpdate,
      id,
    })

    const whereWithACLCondition = this._buildWhereWithACL({}, context, 'write')

    await this.adapter.updateObject({
      className,
      select,
      id,
      context,
      data: resultsAfterBeforeUpdate?.newData || data,
      where: whereWithACLCondition,
    })

    await hook?.runOnSingleObject({
      operationType: OperationType.AfterUpdate,
      id,
      originalObject: resultsAfterBeforeUpdate?.object,
    })

    if (select && Object.keys(select).length === 0) return null

    return this.getObject({
      className,
      context,
      select,
      id,
      isGraphQLCall,
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
    skipHooks,
    isGraphQLCall = false,
  }: UpdateObjectsOptions<T, K, U, W, X>): Promise<OutputType<T, K, W>[]> {
    const whereObject = await this._getWhereObjectWithPointerOrRelation(
      className,
      where || {},
      context,
    )

    const hook = !skipHooks
      ? initializeHook({
          className,
          context,
          newData: data,
          // @ts-expect-error
          select,
        })
      : undefined

    const whereWithACLCondition = this._buildWhereWithACL(
      whereObject,
      context,
      'write',
    )

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
      isGraphQLCall,
    })
  }

  async deleteObject<
    K extends keyof T['types'],
    U extends keyof T['types'][K],
  >({
    context,
    className,
    id,
    select,
    isGraphQLCall = false,
  }: DeleteObjectOptions<T, K, U>): Promise<OutputType<T, K, U>> {
    const hook = initializeHook({
      className,
      context,
      // @ts-expect-error
      select,
    })

    const whereWithACLCondition = this._buildWhereWithACL({}, context, 'write')

    let objectBeforeDelete = null

    if (select && Object.keys(select).length > 0)
      objectBeforeDelete = await this.getObject({
        className,
        select,
        id,
        context,
        isGraphQLCall,
      })

    const resultOfBeforeDelete = await hook.runOnSingleObject({
      operationType: OperationType.BeforeDelete,
      id,
    })

    await this.adapter.deleteObject({
      className,
      context,
      select,
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
    select,
    where,
    first,
    offset,
    order,
    isGraphQLCall = false,
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
    })

    const whereWithACLCondition = this._buildWhereWithACL(
      whereObject,
      context,
      'write',
    )

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
        isGraphQLCall,
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
