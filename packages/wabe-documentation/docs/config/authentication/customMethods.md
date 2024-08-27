# Custom authentication methods

Wabe offers `default` authentication methods such as Google sign-in or email and password authentication. However, you also have the option to create your `own authentication methods` by developing a class that implements the functions of the `ProviderInterface`.

You also need to define various configuration fields: the `name` of the authentication method, the `input` parameters for the authentication method (which will be passed in the signInWith mutation input), as well as the `data to store` in the database, which can be used to compare with the parameters provided by the user in the provider.

```ts
import { Wabe } from "wabe";

const run = async () => {
  const wabe = new Wabe({
    // ... others config fields
    authentication: {
      customAuthenticationMethods: [
        {
          name: "PhonePassword",
          input: {
            phone: {
              type: "Phone",
            },
            password: {
              type: "String",
            },
          },
          // Provider that follow our ProviderInterface type
          provider: new PhonePassword(),
          dataToStore: {
            phone: {
              type: "Phone",
            },
            password: {
              type: "String",
            },
          },
        },
      ],
    },
  });

  await wabe.start();
};

await run();
```

Here is the `ProviderInterface` type that your provider need to implement.

```ts
type ProviderInterface<T = any> = {
  onSignIn: (options: AuthenticationEventsOptions<T>) => Promise<{
    user: Partial<User>;
    oauth?: {
      refreshToken: string;
      accessToken: string;
      accessTokenExpiresAt: Date;
      refreshTokenExpiresAt: Date;
    };
  }>;
  onSignUp: (
    options: AuthenticationEventsOptions<T>,
  ) => Promise<{ authenticationDataToSave: any }>;
};
```
