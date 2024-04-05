import type { WobeResponse } from 'wobe'
import type { _User } from '../../generated/wibe'

export interface Context {
	response: WobeResponse
	user: _User | null
	sessionId: string
	isRoot: boolean
}
