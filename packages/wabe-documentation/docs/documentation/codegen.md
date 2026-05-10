# Codegen

With Wabe, you can configure when code generation is triggered with `codegen`, and provide your own generation pipeline with `onGenerateCodegen`. This inversion of control lets you run any tool you want (for example `oxfmt`, `prettier`, or a custom generator), without Wabe enforcing a formatter strategy.

Your callback is fully custom. In this example, we only format generated files with `oxfmt`.

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
