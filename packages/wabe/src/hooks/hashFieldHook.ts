import { hash, Algorithm } from '@node-rs/argon2'
import type { HookObject } from './HookObject'
import type { WabeTypes } from '../server'
import type { TypeField } from '../schema/Schema'

// Helper to check if a string is already an argon2 hash
function isArgon2Hash(value: string): boolean {
  return typeof value === 'string' && value.startsWith('$argon2')
}

export async function hashFieldHook<
  T extends WabeTypes,
  K extends keyof WabeTypes['types'],
>(hookObject: HookObject<T, K>) {
  // Only run on beforeCreate or beforeUpdate

  if (!['beforeCreate', 'beforeUpdate'].includes(hookObject.operationType))
    return

  const fields = hookObject.context.wabe.config.schema?.classes?.find(
    (cls: any) => cls.name === hookObject.className,
  )?.fields as Record<string, TypeField<T>>
  if (!fields) return

  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    if (
      fieldDef.type === 'Hash' &&
      hookObject.isFieldUpdated(fieldName as keyof T['types'][K])
    ) {
      const value = hookObject.getNewData()[fieldName as keyof T['types'][K]]
      if (typeof value === 'string' && value && !isArgon2Hash(value)) {
        const hashed = await hash(value, { algorithm: Algorithm.Argon2id })
        hookObject.upsertNewData(fieldName as keyof T['types'][K], hashed)
      }
    }
  }
}
