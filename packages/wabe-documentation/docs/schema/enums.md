# Enums

With Wabe, you can create your own `enums` (a TypeScript enum will also be generated if you have codegen enabled). After **restarting** your server (to trigger the codegen), you can easily use it as a field type, as shown in the example below.

```ts
import { DatabaseEnum, Wabe } from "wabe";

const run = async () => {
  const wabe = new Wabe({
    // ... others config fields
    schema: {
      classes: [
        {
          name: "Company",
          fields: {
            country: {
              type: "Country",
            },
          },
        },
      ],
      enums: [
        {
          name: "Country",
          description: "Enum that represents all the Country",
          values: {
            France: "FR",
            UnitedStates: "USA",
          },
        },
      ],
    },
  });

  await wabe.start();
};

await run();
```
