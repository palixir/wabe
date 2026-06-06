export const magicLinkTemplate = (otp: string) => `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Sign in code</title>
      <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
          .email-container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; }
          .header { background-color: #4CAF50; padding: 20px; text-align: center; color: white; }
          .content { padding: 20px; font-size: 16px; line-height: 1.6; color: #333333; }
          .otp-code { display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; font-size: 18px; font-weight: bold; border-radius: 5px; letter-spacing: 2px; }
          .footer { background-color: #f4f4f4; text-align: center; padding: 10px; font-size: 14px; color: #888888; }
      </style>
  </head>
  <body>
      <div class="email-container">
          <div class="header"><h1>Your sign-in code</h1></div>
          <div class="content">
              <p>Hello,</p>
              <p>Use this code to sign in. It is valid for 15 minutes:</p>
              <p class="otp-code">${otp}</p>
              <p>If you did not request this code, you can ignore this email.</p>
          </div>
          <div class="footer"><p>Powered by Wabe</p></div>
      </div>
  </body>
  </html>
`
