import type { WibeContext } from '../../server/interface'
import type { DevWibeAppTypes } from '../../utils/helper'

export const meResolver = async (
	_: any,
	__: any,
	context: WibeContext<DevWibeAppTypes>,
) => {
	return {
		user: context.user,
	}
}
