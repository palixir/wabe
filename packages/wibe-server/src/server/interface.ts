import type { WobeResponse } from 'wobe'
import type { WibeAppTypes, WibeConfig } from '.'
import type { User } from '../../generated/wibe'
import type { DatabaseController } from '../database'

export interface WibeContext<T extends WibeAppTypes> {
	response?: WobeResponse
	user?: User | null
	sessionId?: string
	isRoot: boolean
	databaseController: DatabaseController<T>
	config: WibeConfig<T>
}
