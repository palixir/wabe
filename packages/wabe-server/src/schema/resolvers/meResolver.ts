import type { WabeContext } from '../../server/interface'
import type { DevWabeAppTypes } from '../../utils/helper'

export const meResolver = async (
	_: any,
	__: any,
	context: WabeContext<DevWabeAppTypes>,
) => {
	return {
		user: context.user,
	}
}
