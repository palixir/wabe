# Codegen

With Wabe, you have the option to configure code generation (`codegen`). This feature allows you to generate a schema.graphql file that represents the entirety of the schema you've defined using Wabe. This can be particularly useful for generating types for the front-end or for other uses.

Additionally, the `codegen` creates a `wabe.ts` file in the specified folder. This file contains all the TypeScript types corresponding to your schema. You can, for instance, use it to define [WabeTypes](/wabe/concepts.md#wabetypes) or to have fully typed elements in your backend.

```ts
import { Wabe } from "wabe";

const run = async () => {
  const wabe = new Wabe({
    // ... others config fields
    codegen: {
      enabled: true,
      path: `${import.meta.dirname}/../generated/`,
    },
  });

  await wabe.start();
};

await run();
```
