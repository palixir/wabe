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
): Array<any> => {
  const ignoredFields = ['edges', 'node']

  if (className) ignoredFields.push(firstLetterInLowerCase(className))

  return selectionSet.selections
    ?.flatMap((selection) => {
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
          return res.map((field) => `${currentValue}.${field}`)

        return res
      }

      return currentValue
    })
    .filter((value) => ignoredFields.indexOf(value) === -1)
}

const getFieldsFromInfo = (info: GraphQLResolveInfo, className: string) => {
  const selectionSet = info.fieldNodes[0].selectionSet

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

      if (typeof value === 'object' && value?.createAndLink) {
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
      const [key, value] = Object.entries(currentOrder)[0]

      // @ts-expect-error
      acc[key] = value

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
  const fields = getFieldsFromInfo(info, className)

  return context.wabe.controllers.database.getObject({
    className,
    id,
    fields,
    context,
  })
}

export const queryForMultipleObject = async (
  _: any,
  { where, offset, first, order }: any,
  context: WabeContext<any>,
  info: GraphQLResolveInfo,
  className: keyof WabeTypes['types'],
) => {
  const fields = getFieldsFromInfo(info, className)

  const objects = await context.wabe.controllers.database.getObjects({
    className,
    where,
    fields,
    offset,
    first,
    context,
    order: transformOrder(order),
  })

  return {
    totalCount: fields.includes('totalCount')
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
  const { classFields, othersFields } = getFieldsOfClassName({
    fields: getFieldsFromInfo(info, className),
    className,
    context,
  })

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
        fields: classFields,
        context,
      }),
    ...(othersFields.includes('ok') ? { ok: true } : {}),
  }
}

export const mutationToCreateMultipleObjects = async (
  _: any,
  { input: { fields, offset, first, order } }: any,
  context: WabeContext<any>,
  info: GraphQLResolveInfo,
  className: keyof WabeTypes['types'],
) => {
  const outputFields = getFieldsFromInfo(info, className)
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
    fields: outputFields,
    offset,
    first,
    context,
    order: transformOrder(order),
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
  const { classFields, othersFields } = getFieldsOfClassName({
    fields: getFieldsFromInfo(info, className),
    className,
    context,
  })
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
        fields: classFields,
        context,
      }),
    ...(othersFields.includes('ok') ? { ok: true } : {}),
  }
}

export const mutationToUpdateMultipleObjects = async (
  _: any,
  { input: { fields, where, offset, first, order } }: any,
  context: WabeContext<any>,
  info: GraphQLResolveInfo,
  className: keyof WabeTypes['types'],
) => {
  const outputFields = getFieldsFromInfo(info, className)

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
    fields: outputFields,
    offset,
    first,
    context,
    order,
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
  const { classFields, othersFields } = getFieldsOfClassName({
    fields: getFieldsFromInfo(info, className),
    className,
    context,
  })

  return {
    [firstLetterInLowerCase(className)]:
      await context.wabe.controllers.database.deleteObject({
        className,
        id: args.input?.id,
        fields: classFields,
        context,
      }),
    ...(othersFields.includes('ok') ? { ok: true } : {}),
  }
}

export const mutationToDeleteMultipleObjects = async (
  _: any,
  { input: { where, offset, first, order } }: any,
  context: WabeContext<any>,
  info: GraphQLResolveInfo,
  className: keyof WabeTypes['types'],
) => {
  const outputFields = getFieldsFromInfo(info, className)

  const objects = await context.wabe.controllers.database.deleteObjects({
    className,
    where,
    fields: outputFields,
    offset,
    first,
    context,
    order,
  })

  return {
    edges: objects.map((object: any) => ({ node: object })),
  }
}
