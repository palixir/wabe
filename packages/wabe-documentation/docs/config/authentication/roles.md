# Roles

In Wabe, you have the ability to create as many `roles` as you like. This allows you to assign specific permissions to these roles by managing user roles. When the server is launched, roles will be created in the Role table if they don't already exist in the database.

It’s really simple to do:

```ts
import { Wabe } from "wabe";

const run = async () => {
  const wabe = new Wabe({
    // ... others config fields
    authentication: {
      roles: ["Admin", "Client"],
    },
  });

  await wabe.start();
};

await run();
```
