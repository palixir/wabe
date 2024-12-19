# Security

Wabe provides a set of security configuration options that allow you to customize the security features of your application. These options include CORS, rate limiting, and more.

## CORS

Wabe allows you to configure Cross-Origin Resource Sharing (CORS) to control the access to your API. You can enable CORS by setting the `corsOptions` property in the `security` configuration object.

```ts
import { Wabe } from "wabe";

const run = async () => {
  const wabe = new Wabe({
    // ... others config fields
    security: {
      corsOptions: {
        origin: "http://localhost:3000",
        allowMethods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
        exposedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
        maxAge: 60,
      },
    },
  });

  await wabe.start();
};

await run();
```

## Rate limiting

Rate limiting is a security feature that allows you to limit the number of requests that can be made to your API within a certain time period. You can enable rate limiting by setting the `rateLimit` property in the `security` configuration object.

```ts
import { Wabe } from "wabe";

const run = async () => {
  const wabe = new Wabe({
    // ... others config fields
    security: {
      rateLimit: {
        interval: 60 * 1000, // 1 minute
        numberOfRequests: 100, // 100 requests per minute
      },
    },
  });

  await wabe.start();
};

await run();
```
