import { Mistral } from '@mistralai/mistralai'
import type { AIAdapter, CreateCompletionOptions } from 'wabe'

export class MistralAIAdapter implements AIAdapter {
  public mistral: Mistral

  constructor(apiKey: string) {
    this.mistral = new Mistral({ apiKey })
  }

  async createCompletion({ content }: CreateCompletionOptions) {
    const result = await this.mistral.chat.complete({
      model: 'mistral-small-latest',
      stream: false,
      messages: [
        {
          content,
          role: 'user',
        },
      ],
    })

    const output = result.choices?.[0]?.message.content as string

    if (!output) throw new Error('No content found')

    return output
  }
}
