import { describe, expect, it, mock } from 'bun:test'
import { AIController } from './AIController'

describe('AIController', () => {
  it('should create completion using correct adapter', async () => {
    const mockCreateCompletion = mock(() => {})
    const dummyAdapter = {
      createCompletion: mockCreateCompletion,
    }

    // @ts-expect-error
    const controller = new AIController(dummyAdapter)

    await controller.createCompletion({
      content: 'content',
    })

    expect(mockCreateCompletion).toHaveBeenCalledTimes(1)
    expect(mockCreateCompletion).toHaveBeenCalledWith({
      content: 'content',
    })
  })
})
