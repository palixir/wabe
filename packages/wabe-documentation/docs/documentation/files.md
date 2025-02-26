# Files

Wabe provides the ability to `store` various types of files. To do this, you need to define a file `adapter` in Wabe's configuration. Currently, we haven't implemented a standard adapter for services like Google Storage or AWS, but this feature should be available soon. However, you can easily define your **own adapter**. Here's how:

```ts
import { Wabe } from "wabe";

const run = async () => {
  const wabe = new Wabe({
    // ... others config fields
    file: {
      adapter: async (file) => {
        // ... Upload the file on a bucket, you can for example use the sdk of the host if exists

        // return the url of the file for example
        return "http://bucket.storage/123456/logo.webp";
      },
    },
  });

  await wabe.start();
};

await run();
```
