import type { WabeContext } from '../server/interface'

export const contextWithRoot = (context: WabeContext<any>): WabeContext<any> => ({
	...context,
	isRoot: true,
})

export const notEmpty = <T>(value: T | null | undefined): value is T =>
	value !== null && value !== undefined

export * from './crypto'
export * from './database'
