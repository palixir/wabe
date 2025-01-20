import { describe, expect, it, mock, afterEach } from 'bun:test'

// Mock pour OpenAI
const mockCreateCompletion = mock(() =>
  Promise.resolve({
    choices: [{ message: { content: 'Mocked response' } }],
  }),
)

mock.module('openai', () => ({
  default: class {
    chat = {
      completions: {
        create: mockCreateCompletion,
      },
    }
  },
}))

import { OpenAIAdapter } from '.'

describe('OpenAIAdapter', () => {
  afterEach(() => {
    mockCreateCompletion.mockClear()
  })

  it('should create a completion with OpenAI', async () => {
    const adapter = new OpenAIAdapter('FAKE_API_KEY')

    await adapter.createCompletion({
      content: 'my content',
    })

    expect(mockCreateCompletion).toHaveBeenCalledTimes(1)
    expect(mockCreateCompletion).toHaveBeenCalledWith({
      messages: [{ role: 'user', content: 'my content' }],
      store: false,
      model: 'gpt-4o',
    })
  })
})
