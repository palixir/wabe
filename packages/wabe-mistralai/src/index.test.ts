import { describe, expect, it, mock, afterEach } from 'bun:test'

const mockCreateCompletion = mock(() =>
  Promise.resolve({
    choices: [{ message: { content: 'Mocked response' } }],
  }),
)

mock.module('@mistralai/mistralai', () => ({
  Mistral: class {
    chat = {
      complete: mockCreateCompletion,
    }
  },
}))

import { MistralAIAdapter } from '.'

describe('MistralAIAdapter', () => {
  afterEach(() => {
    mockCreateCompletion.mockClear()
  })

  it('should create a completion with OpenAI', async () => {
    const adapter = new MistralAIAdapter('FAKE_API_KEY')

    await adapter.createCompletion({
      content: 'my content',
    })

    expect(mockCreateCompletion).toHaveBeenCalledTimes(1)
    expect(mockCreateCompletion).toHaveBeenCalledWith({
      messages: [{ role: 'user', content: 'my content' }],
      model: 'mistral-small-latest',
      stream: false,
    })
  })
})
