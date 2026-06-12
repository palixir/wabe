import { describe, expect, it, mock } from 'bun:test'
import { EmailController } from './EmailController'

describe('EmailController', () => {
	it('should send email using correct adapter', async () => {
		const mockSend = mock(() => {})
		const dummyAdapter = {
			send: mockSend,
		}

		// @ts-expect-error
		const controller = new EmailController(dummyAdapter)

		await controller.send({
			from: 'from',
			to: ['to'],
			subject: 'subject',
			text: 'text',
		})

		expect(mockSend).toHaveBeenCalledTimes(1)
		expect(mockSend).toHaveBeenCalledWith({
			from: 'from',
			to: ['to'],
			subject: 'subject',
			text: 'text',
		})
	})

	it('should strip CRLF from header fields to prevent email header injection', async () => {
		const mockSend = mock(() => {})
		const dummyAdapter = {
			send: mockSend,
		}

		// @ts-expect-error
		const controller = new EmailController(dummyAdapter)

		await controller.send({
			from: 'attacker@evil.com\r\nBcc: victim@target.com',
			to: ['user@test.fr\nCc: leak@evil.com'],
			subject: 'Hello\r\nContent-Type: text/html',
			text: 'body',
		})

		expect(mockSend).toHaveBeenCalledTimes(1)

		const sentOptions = (mockSend.mock.calls as any[])[0][0]

		// Removing CR/LF is what neutralizes header injection (no new header line can be forged).
		expect(sentOptions.from).not.toContain('\r')
		expect(sentOptions.from).not.toContain('\n')
		expect(sentOptions.to[0]).not.toContain('\r')
		expect(sentOptions.to[0]).not.toContain('\n')
		expect(sentOptions.subject).not.toContain('\r')
		expect(sentOptions.subject).not.toContain('\n')
		// The body is not a header and must be preserved as-is.
		expect(sentOptions.text).toBe('body')
	})
})
