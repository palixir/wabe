import type React from 'react'

export interface MailSendOptions {
  from: string
  to: Array<string>
  subject: string
  node?: React.ReactNode
  html?: string
  text?: string
}

export interface MailAdapter {
  /**
   * Send an email using the provided adapter
   * @param options Mail options (expeditor, recipient, subject ...)
   * @return The id of the email sended, throw an error if something wrong
   */
  send(options: MailSendOptions): Promise<string>
}
