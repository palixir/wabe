import { JWTPayloadSpec } from '@elysiajs/jwt'
import { Cookie, Context as ElysiaContext } from 'elysia'
import { _User } from '../../generated/wibe'

export type Context = ElysiaContext & { user: _User }

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
