export type HtmlTemplates = {
  sendOTPCode: {
    fn: (options: { otp: string }) => string | Promise<string>
    subject: string
  }
}

export interface EmailSendOptions {
  from: string
  to: Array<string>
  subject: string
  node?: any
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

/**
 * Configuration for the email in Wabe
 * @property adapter The adapter to use to send emails
 * @property mainEmail The email to use as sender for emails sent by Wabe
 * @property templates The html templates to use for a specific email. If not provided, Wabe will use the default templates
 */
export interface EmailConfig {
  adapter: EmailAdapter
  mainEmail?: string
  htmlTemplates?: HtmlTemplates
}
