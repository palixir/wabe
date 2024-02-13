import { WibeSchemaTypes } from '../../../generated/wibe'
import { HookObject } from '../../hooks/HookObject'
import { WibeApp } from '../../server'

export const _findHooksAndExecute = async <
  T extends keyof WibeSchemaTypes,
  K extends keyof WibeSchemaTypes[T],
>({
  className,
  operationType,
  data,
  executionTime
}: {
  className: T
  operationType: string
  data: Record<K, WibeSchemaTypes[T][K]>
  executionTime?: number
}) => {
  const hooks =
    WibeApp.config.hooks?.filter(
      (hook) =>
        hook.className === className &&
        hook.operationType === operationType,
    ) || []

  hooks.map((hook) =>
    hook.callback(new HookObject({
      className,
      data,
      executionTime
    }))
  )
}
