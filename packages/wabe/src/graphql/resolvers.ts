import type { GraphQLResolveInfo, SelectionSetNode } from 'graphql'
import type { WabeTypes } from '..'
import type { WabeContext } from '../server/interface'
import { firstLetterInLowerCase } from '../utils'
import {
  type InputFields,
  type TypeOfExecution,
  add,
  createAndAdd,
  createAndLink,
  remove,
} from './pointerAndRelationFunction'

export const extractFieldsFromSetNode = (
  selectionSet: SelectionSetNode,
  className: string,
): Record<string, any> => {
  const ignoredFields = ['edges', 'node', 'clientMutationId', 'ok']

  if (className) ignoredFields.push(firstLetterInLowerCase(className))

  return selectionSet.selections?.reduce(
    (acc, selection) => {
      //@ts-expect-error
      const currentValue = selection.name.value

      if (
        //@ts-expect-error
        selection.selectionSet?.selections &&
        //@ts-expect-error
        selection.selectionSet?.selections?.length > 0
      ) {
        const res = extractFieldsFromSetNode(
          //@ts-expect-error
          selection.selectionSet,
          className,
        )
        if (ignoredFields.indexOf(currentValue) === -1)
          return {
            ...acc,
            [currentValue]: res,
          }

        return {
          ...acc,
          ...res,
        }
      }

      if (ignoredFields.indexOf(currentValue) === -1) acc[currentValue] = true

      return acc
    },
    {} as Record<string, any>,
  )
}

const getFieldsFromInfo = (info: GraphQLResolveInfo, className: string) => {
  const selectionSet = info.fieldNodes[0]?.selectionSet

  if (!selectionSet) throw new Error('No output fields provided')

  const fields = extractFieldsFromSetNode(selectionSet, className)

  if (!fields) throw new Error('No fields provided')

  return fields
}

export const getFieldsOfClassName = ({
  fields,
  className,
  context,
}: { fields: string[]; className: string; context: WabeContext<any> }): {
  classFields: string[]
  othersFields: string[]
} => {
  const classFields = context.wabe.config.schema?.classes?.find(
    (schemaClass) => schemaClass.name === className,
  )?.fields

  if (!classFields) return { classFields: [], othersFields: fields }

  const sameFieldsAsClass = fields.filter((field) => {
    // If the field exist in the class
    // id is automatically include in a class but not provided in fields
    if (classFields[field] || field === 'id') return true

    // If the name of the field is include in the field provided
    // For example if a pointer field name "Role" is include in the field "role.name"
    if (
      Object.keys(classFields).find((classField) => field.includes(classField))
    )
      return true

    return false
  })

  const othersFields = fields.filter(
    (field) => !sameFieldsAsClass.includes(field),
  )

  return { classFields: sameFieldsAsClass, othersFields }
}

export const executeRelationOnFields = ({
  className,
  fields,
  context,
  id,
  typeOfExecution,
  where,
}: {
  className: string
  fields: InputFields
  context: WabeContext<any>
  id?: string
  where?: any
  typeOfExecution?: TypeOfExecution
}) => {
  const entries = Object.entries(fields)

  return entries.reduce(
    async (acc, [fieldName, value]) => {
      const newAcc = await acc

      if (value instanceof File) {
        newAcc[fieldName] = value
      } else if (typeof value === 'object' && value?.createAndLink) {
        newAcc[fieldName] = await createAndLink({
          createAndLink: value.createAndLink,
          fieldName,
          context,
          className,
        })
      } else if (typeof value === 'object' && value?.link) {
        newAcc[fieldName] = value.link
      } else if (typeof value === 'object' && value.unlink) {
        newAcc[fieldName] = null
      } else if (typeof value === 'object' && value?.createAndAdd) {
        newAcc[fieldName] = await createAndAdd({
          createAndAdd: value.createAndAdd,
          fieldName,
          context,
          className,
        })
      } else if (typeof value === 'object' && value?.add) {
        const addValue = await add({
          add: value.add,
          context,
          fieldName,
          typeOfExecution: typeOfExecution || 'create',
          id,
          className,
          where,
        })

        if (addValue) newAcc[fieldName] = addValue
      } else if (typeof value === 'object' && value?.remove) {
        const removeValue = await remove({
          remove: value.remove,
          context,
          fieldName,
          typeOfExecution: typeOfExecution || 'create',
          id,
          className,
          where,
        })

        if (removeValue) newAcc[fieldName] = removeValue
      } else {
        newAcc[fieldName] = value
      }

      return newAcc
    },
    Promise.resolve({}) as Promise<Record<string, any>>,
  )
}

const transformOrder = (
  order?: Array<string>,
): Record<string, 'ASC' | 'DESC'> =>
  order?.reduce(
    (acc, currentOrder) => {
      const result = Object.entries(currentOrder)[0]

      if (!result || !result[0] || !result[1]) return acc

      // @ts-expect-error
      acc[result[0]] = result[1]

      return acc
    },
    {} as Record<string, 'ASC' | 'DESC'>,
  ) || {}

export const queryForOneObject = (
  _: any,
  { id }: any,
  context: WabeContext<any>,
  info: GraphQLResolveInfo,
  className: keyof WabeTypes['types'],
) => {
  const select = getFieldsFromInfo(info, className)

  return context.wabe.controllers.database.getObject({
    className,
    id,
    select,
    context,
    isGraphQLCall: true,
  })
}

export const queryForMultipleObject = async (
  _: any,
  { where, offset, first, order }: any,
  context: WabeContext<any>,
  info: GraphQLResolveInfo,
  className: keyof WabeTypes['types'],
) => {
  const select = getFieldsFromInfo(info, className)

  const { totalCount, ...selectWithoutTotalCount } = select

  const objects = await context.wabe.controllers.database.getObjects({
    className,
    where,
    select: selectWithoutTotalCount,
    offset,
    first,
    context,
    order: transformOrder(order),
    isGraphQLCall: true,
  })

  return {
    totalCount: totalCount
      ? await context.wabe.controllers.database.count({
          className,
          where,
          context,
        })
      : undefined,
    edges: objects.map((object: any) => ({
      node: object,
    })),
  }
}

export const mutationToCreateObject = async (
  _: any,
  args: any,
  context: WabeContext<any>,
  info: GraphQLResolveInfo,
  className: keyof WabeTypes['types'],
) => {
  const select = getFieldsFromInfo(info, className)

  const updatedFieldsToCreate = await executeRelationOnFields({
    className,
    fields: args.input?.fields,
    context,
  })

  return {
    [firstLetterInLowerCase(className)]:
      await context.wabe.controllers.database.createObject({
        className,
        data: updatedFieldsToCreate,
        select,
        context,
        isGraphQLCall: true,
      }),
    ok: true,
  }
}

export const mutationToCreateMultipleObjects = async (
  _: any,
  { input: { fields, offset, first, order } }: any,
  context: WabeContext<any>,
  info: GraphQLResolveInfo,
  className: keyof WabeTypes['types'],
) => {
  const select = getFieldsFromInfo(info, className)
  const inputFields = fields as Array<any>

  const updatedFieldsToCreate = await Promise.all(
    inputFields.map((inputField) =>
      executeRelationOnFields({
        className,
        fields: inputField,
        context,
      }),
    ),
  )

  const objects = await context.wabe.controllers.database.createObjects({
    className,
    data: updatedFieldsToCreate,
    select,
    offset,
    first,
    context,
    order: transformOrder(order),
    isGraphQLCall: true,
  })

  return {
    edges: objects.map((object: any) => ({ node: object })),
  }
}

export const mutationToUpdateObject = async (
  _: any,
  args: any,
  context: WabeContext<any>,
  info: GraphQLResolveInfo,
  className: keyof WabeTypes['types'],
) => {
  const select = getFieldsFromInfo(info, className)

  const updatedFields = await executeRelationOnFields({
    className,
    fields: args.input?.fields,
    context,
    id: args.input?.id,
    typeOfExecution: 'update',
  })

  return {
    [firstLetterInLowerCase(className)]:
      await context.wabe.controllers.database.updateObject({
        className,
        id: args.input?.id,
        data: updatedFields,
        select,
        context,
        isGraphQLCall: true,
      }),
    ok: true,
  }
}

export const mutationToUpdateMultipleObjects = async (
  _: any,
  { input: { fields, where, offset, first, order } }: any,
  context: WabeContext<any>,
  info: GraphQLResolveInfo,
  className: keyof WabeTypes['types'],
) => {
  const select = getFieldsFromInfo(info, className)

  const updatedFields = await executeRelationOnFields({
    className,
    fields,
    context,
    typeOfExecution: 'updateMany',
    where,
  })

  const objects = await context.wabe.controllers.database.updateObjects({
    className,
    where,
    data: updatedFields,
    select,
    offset,
    first,
    context,
    order,
    isGraphQLCall: true,
  })

  return {
    edges: objects.map((object: any) => ({ node: object })),
  }
}

export const mutationToDeleteObject = async (
  _: any,
  args: any,
  context: WabeContext<any>,
  info: GraphQLResolveInfo,
  className: keyof WabeTypes['types'],
) => {
  const select = getFieldsFromInfo(info, className)

  return {
    [firstLetterInLowerCase(className)]:
      await context.wabe.controllers.database.deleteObject({
        className,
        id: args.input?.id,
        select,
        context,
        isGraphQLCall: true,
      }),
    ok: true,
  }
}

export const mutationToDeleteMultipleObjects = async (
  _: any,
  { input: { where, offset, first, order } }: any,
  context: WabeContext<any>,
  info: GraphQLResolveInfo,
  className: keyof WabeTypes['types'],
) => {
  const select = getFieldsFromInfo(info, className)

  const objects = await context.wabe.controllers.database.deleteObjects({
    className,
    where,
    select,
    offset,
    first,
    context,
    order,
    isGraphQLCall: true,
  })

  return {
    edges: objects.map((object: any) => ({ node: object })),
  }
}
