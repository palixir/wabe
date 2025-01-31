# Custom authentication methods

## Create your own method

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
  onUpdateAuthenticationData?: (
    options: AuthenticationEventsOptionsWithUserId<T>,
  ) => Promise<{ authenticationDataToSave: any }>
};
```

## Example of EmailPassword method

Here is an example of the `EmailPassword` provider that you can use to develop your own provider.

```ts
import type {
  AuthenticationEventsOptions,
  ProviderInterface,
} from "../interface";

type EmailPasswordInterface = {
  password: string;
  email: string;
};

export class EmailPassword
  implements ProviderInterface<EmailPasswordInterface>
{
  async onSignIn({
    input,
    context,
  }: AuthenticationEventsOptions<EmailPasswordInterface>) {
    const users = await context.wabe.controllers.database.getObjects({
      className: "User",
      where: {
        authentication: {
          // @ts-expect-error
          emailPassword: {
            email: { equalTo: input.email },
          },
        },
      },
      context: {
        ...context,
        isRoot: true,
      },
      fields: ["authentication"],
    });

    if (users.length === 0) {
      throw new Error("Invalid authentication credentials");
    }

    const user = users[0];

    const userDatabasePassword = user.authentication?.emailPassword?.password;

    if (!userDatabasePassword) {
      throw new Error("Invalid authentication credentials");
    }

    const isPasswordEquals = await Bun.password.verify(
      input.password,
      userDatabasePassword,
      "argon2id",
    );

    if (
      !isPasswordEquals
      || input.email !== user.authentication?.emailPassword?.email
    ) {
      throw new Error("Invalid authentication credentials");
    }

    return {
      user,
    };
  }

  async onSignUp({
    input,
    context,
  }: AuthenticationEventsOptions<EmailPasswordInterface>) {
    const users = await context.wabe.controllers.database.getObjects({
      className: "User",
      where: {
        authentication: {
          // @ts-expect-error
          emailPassword: {
            email: { equalTo: input.email },
          },
        },
      },
      context,
      fields: [],
    });

    if (users.length > 0) throw new Error("User already exists");

    return {
      authenticationDataToSave: {
        email: input.email,
        password: await Bun.password.hash(input.password, "argon2id"),
      },
    };
  }

  async onUpdateAuthenticationData({
    userId,
    input,
    context,
  }: AuthenticationEventsOptionsWithUserId<EmailPasswordInterface>) {
    const users = await context.wabe.controllers.database.count({
      className: 'User',
      where: {
        id: {
          equalTo: userId,
        },
      },
      context,
    })

    if (users === 0) throw new Error('User not found')

    return {
      authenticationDataToSave: {
        email: input.email,
        // biome-ignore lint/correctness/noConstantCondition: <explanation>
        password: typeof Bun
          ? await Bun.password.hash(input.password, 'argon2id')
          : await argon2.hash(input.password),
      },
    }
  }
}
```
