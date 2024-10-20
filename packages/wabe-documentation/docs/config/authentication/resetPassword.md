# Reset password

To reset password for provider like `emailPassword` you will need 2 mutations. The first one will send an email to the user with an OTP code valid for 5 minutes. The second one will be used to reset the password (with the OTP code in parameter).

## Send OTP code

First we send the OTP code to the user.

```graphql
mutation sendOtpCode {
  sendOtpCode(input: {email: "your.email@gmail.com"})
}
```

## Update the password of the user

In a second time, we can reset the password with the OTP code.

```graphql
mutation resetPassword {
  resetPassword(
    input: {
      email: "your.email@gmail.com"
      password: "newPassword"
      otp: "123456"
      provider: emailPassword
    }
  )
}
```
