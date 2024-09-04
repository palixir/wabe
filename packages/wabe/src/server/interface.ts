import type { WobeResponse } from 'wobe'
import type { Wabe, WabeTypes } from '.'
import type { User } from '../../generated/wabe'

export interface WabeContext<T extends WabeTypes> {
  response?: WobeResponse
  user?: User | null
  sessionId?: string
  isRoot: boolean
  wabe: Wabe<T>
}
