import type { WobeResponse } from 'wobe'
import type { Wabe, WabeTypes } from '.'

export interface WabeContext<T extends WabeTypes> {
  response?: WobeResponse
  user?: T['types']['User'] | null
  sessionId?: string | null
  isRoot: boolean
  wabe: Wabe<T>
  isGraphQLCall?: boolean
}
