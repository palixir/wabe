import { Context as WobeContext } from 'wobe'
import { _User } from '../../generated/wibe'

export type Context = WobeContext & { user: _User }

// export interface Context {
// 	cookie: Record<string, Cookie<any>>
// 	jwt: {
// 		// Here we avoid the elysia schema validation but it's not a problem for the moment
// 		sign: (
// 			payload: Record<string, string | number> & JWTPayloadSpec,
// 		) => Promise<string>
// 		verify: (payload: string) => Promise<false | JWTPayloadSpec>
// 	}
// 	user: _User
// }
