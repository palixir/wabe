# OAuth

Wabe offers authentication methods following the `OAuth` protocol, allowing you to enable `sign-in` with services like Google. To set this up, you first need to define a `success path` and a `failure path`. The success path is where the user will be redirected if the login is successful; otherwise, they will be redirected to the error path.

Once this is configured, on the front-end, you only need to create a "Sign in with ..." button that redirects to the URL `https://127.0.0.1:3000/auth/oauth?provider=google` (example for **google** provider).

```ts
import { Wabe } from "wabe";

const run = async () => {
  const wabe = new Wabe({
    // ... others config fields
    authentication: {
      successRedirectPath: "https://myapp.com/dashboard",
      failureRedirectPath: "https://myapp.com/login",
    },
  });

  await wabe.start();
};

await run();
```
