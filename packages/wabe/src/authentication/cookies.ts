import type { WabeConfig, WabeTypes } from '../server'

export const getSessionCookieSameSite = <T extends WabeTypes>(config: WabeConfig<T>) => {
	const frontDomain = config.authentication?.frontDomain
	const backDomain = config.authentication?.backDomain

	if (frontDomain && backDomain && frontDomain !== backDomain) return 'None'

	return 'Strict'
}
