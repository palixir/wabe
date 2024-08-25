# Schema

The schema object in your Wabe app configuration allows you to define the schema for the various classes your application requires. For example, you might have a "Company" class with a name field if your application needs to store client companies and their names.

# Classes

## Basic class

`Wabe` allows you to create classes with some typed fields inside. For the moment `Wabe` supports natively following types (but you can create your own with `Scalars`) :

- String
- Int
- Float
- Boolean
- Date
- Email
- File
- Object
- Array
- Pointer
- Relation

The `classes` array allow you to create new classe in your project with some fields. In the example below, a company class had a required name and a logo.

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
            name: {
              type: "String",
              required: true,
            },
            logo: {
              type: "File",
            },
          },
        },
      ],
    },
  });

  await wabe.start();
};

await run();
```

## Object field

You can also create more complex structure, like `object` structure. This allows for nested objects.

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
            exampleObject: {
              type: "Object",
              object: {
                name: "ExampleObject",
                fields: {
                  title: {
                    type: "String",
                  },
                  anotherObject: {
                    type: "Object",
                    object: {
                      name: "AnotherObject",
                      fields: {
                        anotherObjectField: {
                          type: "String",
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      ],
    },
  });

  await wabe.start();
};

await run();
```

## Array field

You can also create a field of type Array, which can, for example, contain an array of dates.

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
            arrayOfDate: {
              type: "Array",
              typeValue: "Date",
            },
          },
        },
      ],
    },
  });

  await wabe.start();
};

await run();
```

## Class associations

In many cases, we need to associate classes with each other, which in a relational database is referred to as foreign keys. With `Wabe`, you can easily manage this using `Pointers` or `Relations`. The generated GraphQL API will allow you to easily interact with relations and pointers, and apply conditions to them.

### Pointer

A pointer allows you to associate an object with a unique object from another class. For example, we might say that a company has one primary user. In this case, we would have a Pointer to a user (we’ll see in the GraphQL API section how, with Wabe, you can easily query a pointer field).

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
            mainUser: {
              type: "Pointer",
              class: "User",
            },
          },
        },
      ],
    },
  });

  await wabe.start();
};

await run();
```

### Relation

In contrast to pointers, a relation allows you to associate an object with multiple other objects (essentially an array of objects) from another class. For example, we might say that a company has multiple users. To create this link, we can use a relation.

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
            users: {
              type: "Relation",
              class: "User",
            },
          },
        },
      ],
    },
  });

  await wabe.start();
};

await run();
```
