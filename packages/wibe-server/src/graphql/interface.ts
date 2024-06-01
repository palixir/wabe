import type { _User } from '../../generated/wibe'

export type Context = { user: _User; sessionId: string; isRoot: boolean }
