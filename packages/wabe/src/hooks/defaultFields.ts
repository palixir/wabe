import { getClassFromClassName } from '../utils'
import type { DevWabeTypes } from '../utils/helper'
import type { HookObject } from './HookObject'

export const defaultBeforeCreateForCreatedAt = async (
  object: HookObject<any, any>,
) => {
  if (!object.isFieldUpdate('createdAt'))
    object.upsertNewData('createdAt', new Date())

  if (!object.isFieldUpdate('updatedAt'))
    object.upsertNewData('updatedAt', new Date())
}

export const defaultBeforeUpdateForUpdatedAt = async (
  object: HookObject<any, any>,
) => {
  object.upsertNewData('updatedAt', new Date())
}

export const defaultBeforeCreateForDefaultValue = async (
  object: HookObject<any, any>,
) => {
  const schemaClass = getClassFromClassName<DevWabeTypes>(
    object.className,
    object.context.wabe.config,
  )

  const allFields = Object.keys(schemaClass.fields)

  allFields.map((field) => {
    const currentSchemaField = schemaClass.fields[field]

    if (
      !object.isFieldUpdate(field) &&
      currentSchemaField.type !== 'Pointer' &&
      currentSchemaField.type !== 'Relation' &&
      currentSchemaField.type !== 'File' &&
      currentSchemaField.defaultValue !== undefined
    )
      object.upsertNewData(field, currentSchemaField.defaultValue)
  })
}
