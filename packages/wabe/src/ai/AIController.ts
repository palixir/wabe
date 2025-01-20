import type { AIAdapter, CreateCompletionOptions } from './interface'

export class AIController implements AIAdapter {
  public adapter: AIAdapter

  constructor(adapter: AIAdapter) {
    this.adapter = adapter
  }

  createCompletion(options: CreateCompletionOptions): Promise<string> {
    return this.adapter.createCompletion(options)
  }
}
