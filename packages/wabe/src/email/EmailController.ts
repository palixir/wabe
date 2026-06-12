import type { EmailAdapter, EmailSendOptions } from './interface'

/**
 * Removes CR/LF (and other control characters) from a value used in email headers (from/to/subject).
 * Without this, an attacker-controlled value (e.g. a user email or display name) could inject extra
 * SMTP headers or body content (email header injection).
 */
const stripHeaderInjection = (value: string): string =>
	// eslint-disable-next-line no-control-regex
	value.replace(/[\r\n\u0000-\u001f\u007f]+/g, ' ').trim()

export class EmailController implements EmailAdapter {
	public adapter: EmailAdapter

	constructor(adapter: EmailAdapter) {
		this.adapter = adapter
	}

	send(options: EmailSendOptions) {
		return this.adapter.send({
			...options,
			from: stripHeaderInjection(options.from),
			to: options.to.map(stripHeaderInjection),
			subject: stripHeaderInjection(options.subject),
		})
	}
}
