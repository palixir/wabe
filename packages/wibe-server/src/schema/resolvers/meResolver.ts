import type { WibeContext } from '../../server/interface'
import type { DevWibeAppTypes } from '../../utils/helper'

export const meResolver = async (
	_: any,
	__: any,
	context: WibeContext<DevWibeAppTypes>,
) => {
	const userId = context.user?.id
	const roleName = context.user?.role?.name

	return {
		userId,
		roleName,
	}
}
