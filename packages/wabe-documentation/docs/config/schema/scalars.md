# Scalars

With Wabe, you can create your own `scalars` (a TypeScript type will also be generated if you have codegen enabled). After **restarting** your server (to trigger the codegen), you can easily use them as a field type, as shown in the example below.

To define them, you can specify the same fields as for a GraphQL scalar (parseValue, parseLiteral, serialize, see [here](https://www.apollographql.com/docs/apollo-server/schema/custom-scalars/#serialize) for more information).

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
