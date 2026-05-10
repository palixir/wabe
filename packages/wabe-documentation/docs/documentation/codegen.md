# Codegen

Wabe can generate code artifacts from your schema when `codegen` is enabled.

By default, Wabe generates:
- `wabe.ts` (TypeScript schema types)
- `schema.graphql` (printed GraphQL schema)

`onGenerateCodegen` is optional and is called **after** default generation. Use it for post-processing (for example formatting or custom checks).

Codegen runs only when:
- `isProduction` is `false`
- `NODE_ENV !== "test"`
- `codegen.enabled` is `true`

```ts
import { Wabe } from "wabe";

import { resolve } from "node:path";

const run = async () => {
  const wabe = new Wabe({
    // ... others config fields
    codegen: {
      enabled: true,
      path: `${import.meta.dirname}/../generated/`,
    },
    // Optional: called after wabe.ts/schema.graphql are generated
    onGenerateCodegen: async ({ path }) => {
      const process = Bun.spawn(["bunx", "oxfmt", "--write", resolve(path)]);
      const exitCode = await process.exited;
      if (exitCode !== 0) throw new Error(`oxfmt failed with code ${exitCode}`);
    },
  });

  await wabe.start();
};

await run();
```
