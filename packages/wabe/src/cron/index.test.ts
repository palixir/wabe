import { describe, expect, it, mock } from 'bun:test'
import { cron } from '.'

describe('cron', () => {
  it('should run the function', () => {
    const run = mock()

    const job = cron({
      pattern: '* * * * * *',
      run,
    })

    job.trigger()

    expect(run).toHaveBeenCalled()

    expect(run).toHaveBeenCalled()
  })

  it('should should enable protected runs', async () => {
    const run = mock()

    cron({
      pattern: '* * * * * *',
      run: async () => {
        run()
        await new Promise((resolve) => setTimeout(resolve, 4000))
      },
      enabledProtectedRuns: true,
    })

    await new Promise((resolve) => setTimeout(resolve, 2100))

    expect(run).toHaveBeenCalledTimes(1)
  })
})
