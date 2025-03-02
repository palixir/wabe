import { OperationType } from '.'
import type { DevWabeTypes } from '../utils/helper'
import type { HookObject } from './HookObject'

const _checkProtected = (
  hookObject: HookObject<DevWabeTypes, any>,
  operationType: OperationType,
) => {
  const schemaClass = hookObject.context.wabe.config.schema?.classes?.find(
    (currentClass) => currentClass.name === hookObject.className,
  )

  if (!schemaClass) return

  const userRole = hookObject.getUser()?.role?.name || ''
  const isRoot = hookObject.context.isRoot

  if (operationType === OperationType.BeforeRead) {
    Object.keys(hookObject.select).map((fieldName) => {
      const protectedForCurrentField = schemaClass.fields[fieldName]?.protected

      if (protectedForCurrentField?.operations.includes('read')) {
        if (
          isRoot &&
          protectedForCurrentField.authorizedRoles.includes('rootOnly')
        )
          return

        // @ts-expect-error
        if (!protectedForCurrentField.authorizedRoles.includes(userRole))
          throw new Error('You are not authorized to read this field')
      }
    })

    return
  }

  const fieldsUpdated = hookObject.getNewData()

  Object.keys(fieldsUpdated).map((fieldName) => {
    const protectedForCurrentField = schemaClass.fields[fieldName]?.protected

    if (protectedForCurrentField?.operations.includes('update')) {
      if (
        isRoot &&
        protectedForCurrentField.authorizedRoles.includes('rootOnly')
      )
        return

      // @ts-expect-error
      if (!protectedForCurrentField.authorizedRoles.includes(userRole))
        throw new Error('You are not authorized to update this field')
    }
  })
}

export const defaultCheckProtectedOnBeforeRead = (
  object: HookObject<DevWabeTypes, any>,
) => _checkProtected(object, OperationType.BeforeRead)

export const defaultCheckProtectedOnBeforeUpdate = (
  object: HookObject<DevWabeTypes, any>,
) => _checkProtected(object, OperationType.BeforeUpdate)
