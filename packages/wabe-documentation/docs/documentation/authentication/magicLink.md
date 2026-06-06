# Magic link (email OTP)

Passwordless authentication with a 6-digit code sent by email. The code is valid for **15 minutes** by default (configurable via `magicLinkOtpTtlMs`).

Accounts are created **only after OTP verification**, not when the code is requested.

## Flow

1. Call `signUpWith` (registration) or `signInWith` (login) with `magicLink: { email }`.
2. The API stores a temporary challenge and sends an email with the OTP.
3. Call `verifyChallenge` with `challengeToken`, `email`, and `otp`.
4. On success you receive an `accessToken` (and `refreshToken` if applicable).

For `signInWith`, an email that is not registered yet receives the same API response (`challengeToken`, null tokens) but **no email is sent**. Use `signUpWith` to register a new address. This avoids sending OTP messages to people who never signed up while keeping responses neutral for enumeration.

For `signUpWith`, if the email is already registered, the request fails before sending a code.

## Sign up

```graphql
mutation signUpWith {
  signUpWith(
    input: { authentication: { magicLink: { email: "user@example.com" } } }
  ) {
    challengeToken
    accessToken
    id
  }
}
```

Response before verification: `challengeToken` is set, `accessToken` and `id` are null.

## Sign in

```graphql
mutation signInWith {
  signInWith(
    input: { authentication: { magicLink: { email: "user@example.com" } } }
  ) {
    challengeToken
    accessToken
    user {
      email
    }
  }
}
```

`user` is null when the account does not exist yet.

## Verify OTP

```graphql
mutation verifyChallenge {
  verifyChallenge(
    input: {
      challengeToken: "..."
      secondFA: {
        magicLinkChallenge: { email: "user@example.com", otp: "123456" }
      }
    }
  ) {
    accessToken
  }
}
```

## Configuration

```ts
authentication: {
  security: {
    magicLinkOtpTtlMs: 15 * 60 * 1000, // default: 15 minutes
    magicLinkMaxAttempts: 5, // default: 5 attempts per challenge
  },
},
email: {
  adapter: yourAdapter,
  mainEmail: 'noreply@yourapp.com',
  htmlTemplates: {
    magicLink: {
      subject: 'Your sign-in code',
      fn: async ({ otp }) => `<p>Your code: ${otp}</p>`,
    },
  },
},
```

## Frontend

After `signUpWith` or `signInWith`, show a neutral message such as: “If this email can be used, a code has been sent.”

Do not expose whether the address is already registered on sign-in.

Treat each `challengeToken` as single-use. If you resend a code, only the latest OTP remains valid.
