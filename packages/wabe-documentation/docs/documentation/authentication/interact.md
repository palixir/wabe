# Interact with authentications methods

To interact with your various authentication methods, you can use the `GraphQL API`, which by default provides `mutations`for signing up, logging in, and logging out. Here’s how you can perform these three actions:

When logging in or out, the inputs you pass as parameters to the mutation correspond to the `inputs` defined during the configuration of the `authentication` method. When logging in or signing up, a session is created (if you have chosen a session system based on cookies, a cookie will also be created).

## Sign up

You can disable signUp with the parameters `disableSignUp` in the authentication object :

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
