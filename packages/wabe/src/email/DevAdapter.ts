import type { EmailAdapter } from './interface'

export class EmailDevAdapter implements EmailAdapter {
	async send() {
		return '123456'
	}
}
