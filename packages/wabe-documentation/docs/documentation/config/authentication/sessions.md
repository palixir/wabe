# Sessions

## Configuration session parameters

Wabe gives you the ability to configure your `session` parameters. You can choose the duration of the generated `Access Token` and the duration of the generated `Refresh Token`. You can also decide whether to manage your sessions via `cookies` (so the frontend doesn’t need to do anything) or to avoid storing Access Tokens in cookies (in which case the frontend must send the Access Token in the `Wabe-Access-Token` header with each request).

The `refreshToken` and the `accessToken` are store in the `Session` table in database. The `refreshToken` and the `accessToken` are automatically change after each request when the `cookieSession` is used to limit the possibilities in case of steal.

```ts
import { Wabe } from "wabe";

const run = async () => {
  const wabe = new Wabe({
    // ... others config fields
    authentication: {
      session: {
        // 15 minutes in ms
        accessTokenExpiresInMs: 1000 * 60 * 15,
        // 1 day in ms
        refreshTokenExpiresInMs: 1000 * 60 * 60 * 24,
        cookieSession: true,
      },
    },
  });

  await wabe.start();
};

await run();
```
