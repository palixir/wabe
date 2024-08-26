# Classes

The schema object in your Wabe app configuration allows you to define the schema for the various classes your application requires. For example, you might have a "Company" class with a name field if your application needs to store client companies and their names.

## Simple class

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

### Object field

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

### Array field

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

### Class associations

In many cases, we need to associate classes with each other, which in a relational database is referred to as foreign keys. With `Wabe`, you can easily manage this using `Pointers` or `Relations`. The generated GraphQL API will allow you to easily interact with relations and pointers, and apply conditions to them.

#### Pointer

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

#### Relation

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

## Indexes

When configuring your class, you have the option to specify which fields you want to `index`. To do this, simply define the field name and the order (ASC for ascending order and DESC for descending order). The `order` parameter only impacts the performance of your query, not the order in which you receive the results.

```ts
import { DatabaseEnum, Wabe } from "wabe";

const run = async () => {
  const wabe = new Wabe({
    // ... others config fields
    authentication: {
      // We create one role named Admin
      roles: ["Admin"],
    },
    schema: {
      classes: [
        {
          name: "Company",
          fields: {
            name: {
              type: "String",
            },
            contactEmail: {
              type: "Email",
            },
          },
          indexes: [{ field: "contactEmail", order: "ASC" }],
        },
      ],
    },
  });

  await wabe.start();
};

await run();
```

## Permissions

When configuring your class, you have the option to set specific access `permissions` for that class. These permissions allow you to specify rights for `creating`, `updating`, `deleting`, and `reading` the class data. For each of the four CRUD operations, you can define whether authentication is required to perform the operation and which roles are authorized to execute it for more granular control.

```ts
import { DatabaseEnum, Wabe } from "wabe";

const run = async () => {
  const wabe = new Wabe({
    // ... others config fields
    authentication: {
      // We create one role named Admin
      roles: ["Admin"],
    },
    schema: {
      classes: [
        {
          name: "Company",
          fields: {
            name: {
              type: "String",
            },
            contactEmail: {
              type: "Email",
            },
          },
          permissions: {
            create: {
              authorizedRoles: ["Admin"],
              requireAuthentication: true,
            },
            read: {
              requireAuthentication: false,
            },
            update: {
              requireAuthentication: true,
              authorizedRoles: ["Admin"],
            },
            delete: {
              requireAuthentication: true,
              authorizedRoles: ["Admin"],
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

## Search

Wabe offers the ability to simplify `searches` based on a term or a part of it directly from the frontend. To do this, you need to define the fields you want to be searchable from the frontend in the `searchableFields` array. Each time data is inserted or updated in the fields listed in this array, a process will be triggered to split the content into several segments.

For example, the word "test" would generate ["t", "te", "tes", "test"] in a default field name `search` presents in each classes. The original field will **keep** "test" in database. This allows easy searching from the frontend, without performance overhead, for the term "t", "te", "tes", or "test", and to find the corresponding object in the database.

We will explain in more detail in the GraphQL API section how to easily interact with the search field through the GraphQL API.

```ts
import { DatabaseEnum, Wabe } from "wabe";

const run = async () => {
  const wabe = new Wabe({
    // ... others config fields
    authentication: {
      // We create one role named Admin
      roles: ["Admin"],
    },
    schema: {
      classes: [
        {
          name: "Company",
          fields: {
            name: {
              type: "String",
            },
            contactEmail: {
              type: "Email",
            },
          },
          searchableFieds: ["contactEmail"],
        },
      ],
    },
  });

  await wabe.start();
};

await run();
```
