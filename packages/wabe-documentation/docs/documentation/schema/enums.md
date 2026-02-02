# Enums

Enums allow you to define a set of named constants that can be used as field types. When codegen is enabled, Wabe automatically generates TypeScript enums for your definitions.

## Creating Enums

Enums are defined in the schema configuration and can be used as field types after the server restarts (triggering codegen). Each enum consists of:

- **name**: The enum identifier
- **description**: Optional description (appears in GraphQL documentation)
- **values**: Key-value pairs representing the enum options

```ts
import { Wabe } from "wabe";

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
