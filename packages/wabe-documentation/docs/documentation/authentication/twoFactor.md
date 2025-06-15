# Two-Factor Authentication (2FA)

Wabe makes adding a second authentication factor straightforward. You can:

- Use built-in providers: Email OTP or QR-Code OTP
- Implement your own custom provider

## Introduction

Two-Factor Authentication (2FA) adds an additional layer of security to your application. With Wabe, you can easily add a second authentication factor using built-in providers or by implementing your own custom provider.

## How it Works

### User Configuration

Each user object holds a `secondFA` block:

```ts
    {
      secondFA: {
        enabled: true,
        provider: 'emailOTP', // or 'qrCodeOTP', or your custom name
      },
    }
```

### Sign-In Process with 2FA

1. The user signs in with their credentials (e.g., email and password).
2. If the second factor is enabled, the `onSendChallenge` method of the provider is called. The provider then sends a challenge to the user (e.g., an email with an OTP code or an SMS with a code).
3. The frontend must call the `verifyChallenge` mutation with the data needed to verify the challenge. For example, for Email OTP, the input would be:

```ts
    {
      secondFA: {
        emailOTP: {
          email: 'user@example.com',
          otp: '123456',
        },
      },
    }
```

4. The `verifyChallenge` mutation calls the `onVerifyChallenge` method of the provider and returns the `userId`.

## Examples

### Example with Email OTP

1. The user admin signs in with email and password and receives an email with an OTP code.

```graphql
mutation signInWith {
  signInWith(
    input: {
      authentication: {
        emailPassword: { email: "admin@wabe.dev", password: "admin" }
      }
    }
  ) {
    id
    accessToken
  }
}
```

2. The frontend calls the `verifyChallenge` mutation with the OTP code.

```graphql
mutation verifyChallenge {
  verifyChallenge(
    input: {
      secondFA: { emailOTP: { email: "admin@wabe.dev", otp: "123456" } }
    }
  ) {
    accessToken
  }
}
```

3. The user is now logged in.

### Example with QRCodeOTP

You can use QRCodeOTP methods to let your users use OTP applications like Google Authenticator, Microsoft Authenticator, etc.

1. In your backend, import the OTP class from Wabe and generate a key URI. Then send this key URI to your frontend and display a QRCode.

```ts
import { OTP } from "wabe";

const otp = new OTP("YOUR ROOT KEY");

const keyuri = otp.generateKeyuri({
  userId: "userId",
  emailOrUsername: "email@test.fr",
  applicationName: "Wabe",
});
// Send this keyuri to the frontend you can for example create a custom query for this.
```

2. In your frontend, use a library like `qrcode` to display the QRCode.

```ts
import { useEffect, useState } from 'react'
import qrcode from 'qrcode'

export const Test = () => {
  const [test, setTest] = useState('')

  useEffect(() => {
    qrcode
      .toDataURL(theKeyUriThatYourSendFromTheBackend)
      .then((url) => setTest(url))
  }, [])

  return <img src={test} />
}
```

3. Follow steps similar to those for Email OTP for sign-in and challenge verification.

## Create Your Own Method

To create your own method, you need to create a class that implements the `SecondaryProviderInterface` interface.

1. Implement the `SecondaryProviderInterface` interface.

```ts
import type { SecondaryProviderInterface } from "wabe";

export class YourCustomProvider implements SecondaryProviderInterface {
  async onSendChallenge({ user, context }) {
    // Send the challenge to the user
  }

  async onVerifyChallenge({ input, context }) {
    // Verify the challenge
    return { userId: "userId" };
  }
}
```

2. Add it to the `customAuthenticationMethods` array in the `authentication` object of the config.

```ts
    authentication: {
      customAuthenticationMethods: [
        {
          name: 'yourCustomMethod',
          input: {
            email: {
              type: 'Email',
              required: true,
            },
            otp: {
              type: 'String',
              required: true,
            },
          },
          provider: new YourCustomProvider(),
        },
      ],
    },
```

3. Use it in the `signInWith` mutation.

```graphql
mutation signInWith {
  signInWith(
    input: {
      authentication: {
        emailPassword: { email: "admin@wabe.dev", password: "admin" }
      }
    }
  ) {
    id
    accessToken
  }
}
```

4. Use it in the `verifyChallenge` mutation.

```graphql
mutation verifyChallenge {
  verifyChallenge(
    input: {
      secondFA: { yourCustomMethod: { email: "admin@wabe.dev", otp: "123456" } }
    }
  ) {
    accessToken
  }
}
```
