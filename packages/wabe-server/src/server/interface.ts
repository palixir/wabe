import type { WobeResponse } from 'wobe'
import type { WabeApp, WabeAppTypes } from '.'
import type { User } from '../../generated/wabe'

export interface WabeContext<T extends WabeAppTypes> {
	response?: WobeResponse
	user?: User | null
	sessionId?: string
	isRoot: boolean
	wabeApp: WabeApp<T>
}
