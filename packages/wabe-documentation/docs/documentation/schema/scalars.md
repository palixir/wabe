# Scalars

Custom scalars allow you to extend Wabe's type system with your own data types. When codegen is enabled, Wabe automatically generates TypeScript types for your custom scalars.

## Creating Custom Scalars

Custom scalars follow the GraphQL scalar specification and require implementing:

- **parseValue**: Convert input values from variables
- **parseLiteral**: Convert input values from AST literals  
- **serialize**: Convert output values for responses

After defining a scalar and restarting your server (to trigger codegen), you can use it as a field type in your classes.

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
            name: {
              type: "String",
            },
            contactPhone: {
              type: "Phone",
            },
          },
        },
      ],
      scalars: [
        {
          name: "Phone",
          description: "Phone scalar",
          parseValue(value: any) {
            if (typeof value !== "string") {
              throw new Error("Invalid phone");
            }

            if (
              !value.match(
                /^(?:(?:\+33|0033)[\s.-]?)?[1-9](?:[\s.-]?\d{2}){4}$/,
              )
            ) {
              throw new Error("Invalid phone");
            }

            return value;
          },
        },
      ],
    },
  });

  await wabe.start();
};

await run();
```
