import { describe, expect, it, mock, spyOn, beforeEach } from 'bun:test'
import { ResendAdapter } from '.'
import { Resend } from 'resend'

describe('Resend', () => {
	const mockSend = mock(() => {}).mockResolvedValueOnce({
		data: { id: 'id' },
		error: null,
	} as never)

	spyOn(Resend.prototype, 'emails').mockReturnValue({
		send: mockSend,
	} as never)

	beforeEach(() => {
		mockSend.mockClear()
	})

	it('should send email with resend', async () => {
		const adapter = new ResendAdapter('FAKE_API_KEY')

		await adapter.send({
			from: 'test@wabe.dev',
			to: ['delivered@resend.dev'],
			subject: 'Test',
			text: 'Content of the email',
		})

		expect(mockSend).toHaveBeenCalledTimes(1)
		expect(mockSend).toHaveBeenCalledWith({
			from: 'test@wabe.dev',
			to: ['delivered@resend.dev'],
			subject: 'Test',
			text: 'Content of the email',
		})
	})

	it('should throw error if something wrong', () => {
		mockSend.mockResolvedValueOnce({
			data: { id: 'id' },
			error: {
				message: 'error message',
			},
		} as never)

		const adapter = new ResendAdapter('FAKE_API_KEY')

		expect(
			adapter.send({
				from: 'test@wabe.dev',
				to: ['delivered@resend.dev'],
				subject: 'Test',
				text: 'Content of the email',
			}),
		).rejects.toThrow('error message')

		expect(mockSend).toHaveBeenCalledTimes(1)
		expect(mockSend).toHaveBeenCalledWith({
			from: 'test@wabe.dev',
			to: ['delivered@resend.dev'],
			subject: 'Test',
			text: 'Content of the email',
		})
	})
})
