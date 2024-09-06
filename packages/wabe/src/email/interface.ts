import type React from 'react'

export interface EmailSendOptions {
  from: string
  to: Array<string>
  subject: string
  node?: React.ReactNode
  html?: string
  text?: string
}

export interface EmailAdapter {
  /**
   * Send an email using the provided adapter
   * @param options Mail options (expeditor, recipient, subject ...)
   * @return The id of the email sended, throw an error if something wrong
   */
  send(options: EmailSendOptions): Promise<string>
}

export interface EmailConfig {
  adapter: EmailAdapter
}
