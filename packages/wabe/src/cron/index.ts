import { Cron } from 'croner'
import type { Wabe, WabeTypes } from '../server'

export type OutputCron<T extends WabeTypes> = (wabe: Wabe<T>) => Cron

export const cron =
	<T extends WabeTypes>({
		pattern,
		run,
		maxRuns,
		enabledProtectedRuns,
	}: {
		pattern: string
		maxRuns?: number
		enabledProtectedRuns?: boolean
		run: (wabe: Wabe<T>) => any | Promise<any>
	}): OutputCron<T> =>
	(wabe: Wabe<T>) =>
		new Cron(pattern, { maxRuns, protect: enabledProtectedRuns }, () =>
			run(wabe),
		)

export enum CronExpressions {
	EVERY_SECOND = '* * * * * *',
	EVERY_MINUTE = '0 * * * * *',
	EVERY_HOUR = '0 0 * * * *',
	EVERY_DAY_AT_MIDNIGHT = '0 0 0 * * *',
	EVERY_WEEK = '0 0 0 * * 0',
	EVERY_MONTH = '0 0 0 1 * *',
	EVERY_YEAR = '0 0 0 1 1 *',
	WEEKDAYS_MORNING = '0 0 7 * * 1-5', // Every weekday at 7 AM
	WEEKENDS_EVENING = '0 0 19 * * 6-7', // Every weekend at 7 PM
	FIRST_DAY_OF_MONTH = '0 0 0 1 * *',
	LAST_DAY_OF_MONTH = '0 0 0 L * *', // L stands for the last day of the month
	EVERY_15_MINUTES = '0 */15 * * * *',
	EVERY_30_MINUTES = '0 */30 * * * *',
	EVERY_2_HOURS = '0 0 */2 * * *',
	EVERY_6_HOURS = '0 0 */6 * * *',
	EVERY_12_HOURS = '0 0 */12 * * *',
}

export type CronConfig<T extends WabeTypes> = Array<{
	name: string
	cron: OutputCron<T>
	job?: Cron
}>
