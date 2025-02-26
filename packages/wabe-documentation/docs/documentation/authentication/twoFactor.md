# Two-factor authentication

Wabe supports two-factor authentication (2FA) very easily. It is possible to add a second factor to your authentication methods. You have two options, use default methods provided by Wabe or create your own. Wabe provides a default method for email OTP.

## How it works

User contains an object `secondFA` that contains the namf of the second factor and some other information like if the second factor is enabled or not.

```ts
{
  secondFA: {
    enabled: true,
    provider: 'emailOTP',
  },
}
```

If the second factor is enabled, when the user signs in with for example email and password, the signIn will launch the `onSendChallenge` method of the provider. The provider will then send a challenge to the user for example an email with a OTP code or a SMS with a code.

Than the front will have to call the `verifyChallenge` mutation with the data needed to verify the challenge, for example for email OTP the input will be:

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

The `verifyChallenge` mutation will then call the `onVerifyChallenge` method of the provider and return the userId.

## Example

First the user admin will sign in with email and password, and the user will receive an email with an OTP code.

```graphql
mutation signInWith {
  signInWith(
    input: {authentication: {emailPassword: {email: "admin@wabe.dev", password: "admin"}}}
  ) {
    id
    accessToken
  }
}
```

Then the front will call the `verifyChallenge` mutation with the OTP code.

```graphql
mutation verifyChallenge {
  verifyChallenge(
    input: {
      secondFA: {
        EmailOTP: {
          email: "admin@wabe.dev"
          otp: "123456"
        }
      }
    }
  ) {
    accessToken
  }
}
```

Finally the user will be logged in.

## Create your own method

To create your own method, you need to create a class that implements the `SecondaryProviderInterface` interface.

```ts
import type { SecondaryProviderInterface } from 'wabe'

export class YourCustomProvider implements SecondaryProviderInterface {
  async onSendChallenge({ user, context }) {
    // Send the challenge to the user
  }

  async onVerifyChallenge({ input, context }) {
    // Verify the challenge
    return { userId: 'userId' }
  }
}
```

Then you need to add it to the `customAuthenticationMethods` array in the `authentication` object of the config.

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

Now you can use it in the `signInWith` mutation.

```graphql
mutation signInWith {
  signInWith(
    input: {
      authentication: {
        emailPassword: {
          email: "admin@wabe.dev"
          password: "admin"
        }
      }
    }
  ) {
    id
    accessToken
  }
}
```

And in the `verifyChallenge` mutation.

```graphql
mutation verifyChallenge {
  verifyChallenge(
    input: {
      secondFA: {
        yourCustomMethod: {
          email: "admin@wabe.dev"
          otp: "123456"
        }
      }
    }
  ) {
    accessToken
  }
}
```
