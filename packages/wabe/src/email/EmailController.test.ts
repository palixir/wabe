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
})
