import { JWTPayloadSpec } from '@elysiajs/jwt'
import { Cookie } from 'elysia'

export interface Context {
	cookie: Record<string, Cookie<any>>
	jwt: {
		sign: (payload: JWTPayloadSpec) => Promise<string>
		verify: (payload: string) => Promise<false | JWTPayloadSpec>
	}
}
