import type { WobeResponse } from 'wobe'
import type { User } from '../../generated/wibe'

export interface Context {
	response?: WobeResponse
	user?: User | null
	sessionId?: string
	isRoot: boolean
}
