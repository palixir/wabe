import { describe, expect, it, mock } from 'bun:test'
import { sendEmailResolver } from './sendEmail'
import type { WabeContext } from '../../server/interface'

describe('SendEmail', () => {
  it('should throw an error if email adapter is not defined', async () => {
    expect(
      sendEmailResolver(
        undefined,
        {
          input: { from: 'from', to: ['to'], subject: 'subject', text: 'text' },
        },
        {
          isRoot: false,
          user: {
            id: 'id',
          },
          wabe: {
            controllers: {
              email: undefined,
            } as any,
          },
        } as WabeContext<any>,
      ),
    ).rejects.toThrow('Email adapter not defined')
  })

  it('should send email when user is connected', async () => {
    const mockSend = mock(() => {}).mockResolvedValueOnce(true as never)

    const res = await sendEmailResolver(
      undefined,
      {
        input: { from: 'from', to: ['to'], subject: 'subject', text: 'text' },
      },
      {
        isRoot: false,
        user: {
          id: 'id',
        },
        wabe: {
          controllers: {
            email: {
              send: mockSend,
            },
          } as any,
        },
      } as WabeContext<any>,
    )

    expect(res).toBeTrue()

    expect(mockSend).toHaveBeenCalledTimes(1)
    expect(mockSend).toHaveBeenCalledWith({
      from: 'from',
      to: ['to'],
      subject: 'subject',
      text: 'text',
    })
  })

  it('should send email when user is root', async () => {
    const mockSend = mock(() => {}).mockResolvedValueOnce(true as never)

    const res = await sendEmailResolver(
      undefined,
      {
        input: { from: 'from', to: ['to'], subject: 'subject', text: 'text' },
      },
      {
        isRoot: true,
        wabe: {
          controllers: {
            email: {
              send: mockSend,
            },
          } as any,
        },
      } as WabeContext<any>,
    )

    expect(res).toBeTrue()

    expect(mockSend).toHaveBeenCalledTimes(1)
    expect(mockSend).toHaveBeenCalledWith({
      from: 'from',
      to: ['to'],
      subject: 'subject',
      text: 'text',
    })
  })

  it('should not send email when user is not connected and is not root', async () => {
    const mockSend = mock(() => {}).mockResolvedValueOnce(true as never)

    expect(
      sendEmailResolver(
        undefined,
        {
          input: { from: 'from', to: ['to'], subject: 'subject', text: 'text' },
        },
        {
          isRoot: false,
          user: undefined,
          wabe: {
            controllers: {
              email: {
                send: mockSend,
              },
            } as any,
          },
        } as WabeContext<any>,
      ),
    ).rejects.toThrow('Permission denied')

    expect(mockSend).toHaveBeenCalledTimes(0)
  })
})
