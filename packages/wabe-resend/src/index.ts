import { Resend } from 'resend'
import type { MailAdapter, MailSendOptions } from 'wabe'

export class ResendAdapter implements MailAdapter {
  private resend: Resend

  constructor(apiKey: string) {
    this.resend = new Resend(apiKey)
  }

  async send({ node, ...input }: MailSendOptions) {
    const { data, error } = await this.resend.emails.send({
      ...input,
      react: node,
    })

    if (error) throw new Error(error.message)

    if (!data) throw new Error('Email not send')

    return data.id
  }
}
