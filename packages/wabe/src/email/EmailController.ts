import type { EmailAdapter, EmailSendOptions } from './interface'

export class EmailController implements EmailAdapter {
	public adapter: EmailAdapter

	constructor(adapter: EmailAdapter) {
		this.adapter = adapter
	}

	send(options: EmailSendOptions) {
		return this.adapter.send(options)
	}
}
