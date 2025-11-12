import { describe, expect, it, mock } from 'bun:test'
import { cron } from '.'

describe('cron', () => {
	it('should run the function', () => {
		const run = mock()

		const job = cron({
			pattern: '* * * * * *',
			run,
		})({} as any)

		job.trigger()

		expect(run).toHaveBeenCalledTimes(1)
	})
})
