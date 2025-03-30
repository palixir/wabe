import OpenAI from 'openai'
import type { AIAdapter, CreateCompletionOptions } from 'wabe'

export class OpenAIAdapter implements AIAdapter {
  public openai: OpenAI
  private model: string

  constructor(apiKey: string, options?: { model?: string }) {
    this.openai = new OpenAI({ apiKey })
    this.model = options?.model || 'gpt-4o'
  }

  async createCompletion({ content }: CreateCompletionOptions) {
    const chatCompletion = await this.openai.chat.completions.create({
      messages: [{ role: 'user', content }],
      model: this.model,
      store: false,
    })

    return chatCompletion.choices[0].message.content || ''
  }
}
