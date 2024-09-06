import { describe, expect, it, mock, spyOn } from 'bun:test'
import { ResendAdapter } from '.'
import { Resend } from 'resend'

describe('Resend', () => {
  it('should send email with resend', async () => {
    const mockSend = mock(() => {}).mockResolvedValueOnce({
      data: { id: 'id' },
      error: null,
    } as never)

    spyOn(Resend.prototype, 'emails').mockReturnValue({
      send: mockSend,
    } as never)

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
})
