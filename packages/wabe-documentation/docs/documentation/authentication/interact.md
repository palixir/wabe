# Authentication Methods

Wabe provides built-in authentication functionality accessible through the GraphQL API. The API includes mutations for user registration, login, and logout operations.

## Authentication Flow

- **Sign Up**: Create new user accounts
- **Sign In**: Authenticate existing users and create sessions
- **Sign Out**: Terminate user sessions

Authentication mutations accept input parameters that correspond to the authentication methods you've configured. Successful login/signup operations create sessions, and cookie-based session systems will set appropriate cookies.

## Sign Up

The sign-up functionality can be disabled by setting `disableSignUp: true` in the authentication configuration. When enabled, it allows new users to create accounts.

```ts
import { Wabe } from "wabe";

const run = async () => {
  // Ensure your database is running before run the file
  const wabe = new Wabe({
    // ... Others configuration fields
    authentication: {
      disableSignUp: true,
    },
    port: 3001,
  });

  await wabe.start();
};

await run();
```

```graphql
mutation signUpWith {
  signUpWith(
    input: {
      authentication: {
        emailPassword: { email: "your.email@gmail.com", password: "password" }
      }
    }
  ) {
    id
    accessToken
    refreshToken
  }
}
```

## Sign in

```graphql
mutation signInWith {
  signInWith(
    input: {
      authentication: {
        emailPassword: { email: "your.email@gmail.com", password: "password" }
      }
    }
  ) {
    id
    accessToken
    refreshToken
  }
}
```

## Sign out

```graphql
mutation signOut {
  signOut
}
```
