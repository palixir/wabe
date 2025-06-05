import { hash, Algorithm } from '@node-rs/argon2'
import type { HookObject } from './HookObject'
import type { WabeTypes } from '../server'
import type { TypeField } from '../schema/Schema'
import {
  getNestedProperty,
  isArgon2Hash,
  getNewObjectAfterUpdateNestedProperty,
} from '../utils'
import { OperationType } from '.'

const hashField = ({
  value,
}: {
  value: ReturnType<typeof HookObject.prototype.getNewData>
}) => {
  if (!value || typeof value !== 'string') return

  if (isArgon2Hash(value)) return value

  return hash(value, { algorithm: Algorithm.Argon2id })
}

export async function hashFieldHook<
  T extends WabeTypes,
  K extends keyof WabeTypes['types'],
>(hookObject: HookObject<T, K>) {
  if (
    hookObject.operationType !== OperationType.BeforeCreate &&
    hookObject.operationType !== OperationType.BeforeUpdate
  )
    return

  const fields = hookObject.context.wabe.config.schema?.classes?.find(
    (cls: any) => cls.name === hookObject.className,
  )?.fields as Record<string, TypeField<T>>

  if (!fields) return

  const computeHashForFields = async ({
    fieldsToCompute,
    path = '',
  }: {
    fieldsToCompute: typeof fields
    path?: string
  }) => {
    for (const [fieldName, fieldDef] of Object.entries(fieldsToCompute)) {
      if (fieldDef.type === 'Object') {
        await computeHashForFields({
          // @ts-expect-error
          fieldsToCompute: fieldDef.object.fields,
          path: `${path || ''}${path ? '.' : ''}${fieldName}`,
        })

        continue
      }

      if (fieldDef.type !== 'Hash') continue

      // If we don't have nested object
      if (!path) {
        const hashed = await hashField({
          // @ts-expect-error
          value: hookObject.getNewData()[fieldName],
        })

        // @ts-expect-error
        hookObject.upsertNewData(fieldName, hashed)

        continue
      }

      const objectNameToUpdate = path.split('.')[0]
      // @ts-expect-error
      const objectToUpdate = hookObject.getNewData()[objectNameToUpdate]
      const valueToUpdate = getNestedProperty(hookObject.getNewData(), path)

      if (!valueToUpdate?.[fieldName]) continue

      const hashed = await hashField({
        value: valueToUpdate[fieldName],
      })

      const newObject = getNewObjectAfterUpdateNestedProperty(
        { [objectNameToUpdate]: objectToUpdate },
        `${path}.${fieldName}`,
        hashed,
      )

      if (hashed)
        hookObject.upsertNewData(
          // @ts-expect-error
          objectNameToUpdate,
          newObject[objectNameToUpdate],
        )
    }
  }

  await computeHashForFields({ fieldsToCompute: fields })
}
