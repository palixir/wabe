export interface CreateCompletionOptions {
  content: string
}

export interface AIAdapter {
  createCompletion(options: CreateCompletionOptions): Promise<string>
}

export interface AIConfig {
  adapter: AIAdapter
}
