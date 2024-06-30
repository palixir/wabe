import type { WobeResponse } from 'wobe'
import type { User } from '../generated/wibe'
import type { DatabaseController } from '../database'

export interface Context {
	response?: WobeResponse
	user?: User | null
	sessionId?: string
	isRoot: boolean
	databaseController: DatabaseController
}
