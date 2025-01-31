# Routes

Because we know that every application is unique, you can also add custom REST endpoints. Wabe uses Wobe under the hood as its web framework. You can create routes just like in the example below. The handler's parameter is a `WobeContext` (see [here](https://wobe.dev) for more information).

```ts
import { Wabe } from "wabe";

const run = async () => {
  const wabe = new Wabe({
    // ... others config fields
    routes: [
      {
        path: "/hello",
        method: "GET",
        handler: (ctx) => {
          return ctx.res.send("Hello world !");
        },
      },
    ],
  });

  await wabe.start();
};

await run();
```
