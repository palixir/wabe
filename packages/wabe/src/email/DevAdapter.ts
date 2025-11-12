import type { EmailAdapter } from './interface'

export class EmailDevAdapter implements EmailAdapter {
	// biome-ignore lint/suspicious/useAwait: false
	async send() {
		return '123456'
	}
}
