import type { WobeResponse } from 'wobe'
import type { WibeApp, WibeAppTypes } from '.'
import type { User } from '../../generated/wibe'

export interface WibeContext<T extends WibeAppTypes> {
	response?: WobeResponse
	user?: User | null
	sessionId?: string
	isRoot: boolean
	wibeApp: WibeApp<T>
}
