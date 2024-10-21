export const sendOtpCodeTemplate = (otp: string) => `
  <!DOCTYPE html>
  <html lang="en">

  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="ie=edge">
      <title>Password Reset</title>
      <style>
          body {
              font-family: 'Arial', sans-serif;
              margin: 0;
              padding: 0;
              background-color: #f4f4f4;
          }

          .email-container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 8px;
              box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
              overflow: hidden;
          }

          .header {
              background-color: #4CAF50;
              padding: 20px;
              text-align: center;
              color: white;
          }

          .header h1 {
              margin: 0;
              font-size: 24px;
          }

          .content {
              padding: 20px;
              font-size: 16px;
              line-height: 1.6;
              color: #333333;
          }

          .content p {
              margin-bottom: 20px;
          }

          .otp-code {
              display: inline-block;
              padding: 10px 20px;
              background-color: #4CAF50;
              color: white;
              font-size: 18px;
              font-weight: bold;
              border-radius: 5px;
              letter-spacing: 2px;
              text-align: center;
          }

          .footer {
              background-color: #f4f4f4;
              text-align: center;
              padding: 10px;
              font-size: 14px;
              color: #888888;
          }

          .footer p {
              margin: 0;
          }

          /* Responsive Design */
          @media screen and (max-width: 600px) {
              .email-container {
                  width: 100%;
              }

              .header h1 {
                  font-size: 20px;
              }

              .content {
                  padding: 15px;
              }

              .otp-code {
                  font-size: 16px;
                  padding: 8px 16px;
              }
          }
      </style>
  </head>

  <body>
      <div class="email-container">
          <!-- Email Header -->
          <div class="header">
              <h1>Confirmation code</h1>
          </div>

          <!-- Email Content -->
          <div class="content">
              <p>Hello,</p>
              <p>Here is your confirmation code. Please use the OTP code (valid for 5 minutes) below to proceed the action:</p>
              <p class="otp-code">${otp}</p>
              <p>If you did not request this code, please ignore this email.</p>
              <p>Thank you</p>
          </div>

          <!-- Email Footer -->
          <div class="footer">
              <p>Powered by Wabe</p>
          </div>
      </div>
  </body>

  </html>
`
