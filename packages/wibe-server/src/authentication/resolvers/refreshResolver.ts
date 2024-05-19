import type { Context } from '../../graphql/interface'
import { Session } from '../Session'

export const refreshResolver = async (_: any, __: any, context: Context) => {
	const session = new Session()

	await session.refresh(context.sessionId, context)

	return true
}
