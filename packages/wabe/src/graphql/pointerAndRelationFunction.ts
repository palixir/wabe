import { getClassFromClassName } from '../utils'
import type { WabeContext } from '../server/interface'

type CreateAndLink = any
type Link = string
type Unlink = boolean
type Add = Array<string>
type Remove = Array<string>
type CreateAndAdd = Array<any>

export type TypeOfExecution = 'create' | 'update' | 'updateMany'

export type InputFields = Record<
  string,
  | {
      createAndLink?: CreateAndLink
      link?: Link
      unlink?: Unlink
      add?: Add
      remove?: Remove
      createAndAdd?: CreateAndAdd
    }
  | string
>

export const createAndLink = async ({
  createAndLink,
  context,
  fieldName,
  className,
}: {
  createAndLink: CreateAndLink
  fieldName: string
  context: WabeContext<any>
  className: string
}) => {
  const classInSchema = getClassFromClassName(className, context.wabe.config)

  const res = await context.wabe.controllers.database.createObject({
    // @ts-expect-error
    className: classInSchema.fields[fieldName].class,
    data: createAndLink,
    select: { id: true },
    context,
  })

  return res?.id
}

export const createAndAdd = async ({
  createAndAdd,
  context,
  fieldName,
  className,
}: {
  createAndAdd: CreateAndAdd
  fieldName: string
  context: WabeContext<any>
  className: string
}) => {
  const classInSchema = getClassFromClassName(className, context.wabe.config)

  const result = await context.wabe.controllers.database.createObjects({
    // @ts-expect-error
    className: classInSchema.fields[fieldName].class,
    data: createAndAdd,
    select: { id: true },
    context,
  })

  return result.map((object: any) => object.id)
}

export const add = async ({
  add,
  context,
  fieldName,
  typeOfExecution,
  id,
  className,
  where,
}: {
  add: Add
  fieldName: string
  context: WabeContext<any>
  typeOfExecution: TypeOfExecution
  id?: string
  className: string
  where: any
}) => {
  if (typeOfExecution === 'create') return add

  const classInSchema = getClassFromClassName(className, context.wabe.config)

  const fieldInClass = classInSchema.fields[fieldName]

  if (typeOfExecution === 'update' && id) {
    const currentValue = await context.wabe.controllers.database.getObject({
      className,
      id,
      select: { [fieldName]: true },
      context,
    })

    return [...(currentValue?.[fieldName] || []), ...add]
  }

  // For update many we need to get all objects that match the where and add the new value
  // So we doesn't update the field for updateMany
  if (typeOfExecution === 'updateMany' && where) {
    const allObjectsMatchedWithWhere =
      await context.wabe.controllers.database.getObjects({
        // @ts-expect-error
        className: fieldInClass.class,
        where,
        select: { [fieldName]: true },
        context,
      })

    await Promise.all(
      allObjectsMatchedWithWhere.map((object: any) => {
        const currentValue = object[fieldName]

        return context.wabe.controllers.database.updateObject({
          // @ts-expect-error
          className: classInSchema.fields[fieldName].class,
          id: object.id,
          data: {
            [fieldName]: [...(currentValue || []), ...add],
          },
          context,
          select: {},
        })
      }),
    )
  }
}

export const remove = async ({
  remove,
  context,
  fieldName,
  typeOfExecution,
  id,
  className,
  where,
}: {
  remove: Remove
  fieldName: string
  context: WabeContext<any>
  typeOfExecution: TypeOfExecution
  id?: string
  className: string
  where: any
}) => {
  if (typeOfExecution === 'create') return []

  if (typeOfExecution === 'update' && id) {
    const currentValue = await context.wabe.controllers.database.getObject({
      className,
      id,
      select: { [fieldName]: true },
      context,
    })

    const olderValues = currentValue?.[fieldName] || []

    return olderValues.filter((olderValue: any) => !remove.includes(olderValue))
  }

  if (typeOfExecution === 'updateMany' && where) {
    const allObjectsMatchedWithWhere =
      await context.wabe.controllers.database.getObjects({
        className,
        where,
        select: { id: true },
        context,
      })

    await Promise.all(
      allObjectsMatchedWithWhere.map(async (object: any) => {
        const olderValues = object[fieldName]?.[fieldName] || []

        return context.wabe.controllers.database.updateObject({
          className,
          id: object.id,
          data: {
            [fieldName]: olderValues.filter(
              (olderValue: any) => !remove.includes(olderValue),
            ),
          },
          context,
          select: {},
        })
      }),
    )
  }
}
