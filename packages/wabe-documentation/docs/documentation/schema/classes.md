# Classes

Classes are the core building blocks of your Wabe application's data model. Each class represents a collection of objects with defined fields and behaviors. The schema configuration allows you to define the structure and capabilities of these classes.

## Supported Field Types

Wabe supports the following native field types (with the ability to extend through custom scalars):

- **String**: Text data
- **Int**: Integer numbers
- **Float**: Decimal numbers
- **Boolean**: True/false values
- **Date**: Date and time values (stored as ISO strings)
- **Email**: Email addresses with validation
- **File**: File references with automatic storage handling
- **Object**: Nested object structures
- **Array**: Arrays of values (can specify element type)
- **Pointer**: Single reference to another class object
- **Relation**: Multiple references to objects of another class
- **Virtual**: Computed fields derived from other fields at read time
- **Hash**: Secure password hashing

The `classes` array allow you to create new classe in your project with some fields. In the example below, a company class had a required name and a logo.

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
import { Wabe } from "wabe";

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
import { Wabe } from "wabe";

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
import { Wabe } from "wabe";

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
import { Wabe } from "wabe";

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

#### Virtual

Virtual fields are computed at read time from other fields. They are not stored in the database and cannot be used in create or update operations. Use them to derive values like full names, computed booleans, or formatted strings without duplicating data.

Each virtual field requires:

- **returnType**: The GraphQL type of the computed value (`String`, `Int`, `Float`, `Boolean`, `Date`, `Email`, or `Phone`)
- **dependsOn**: An array of field names that the callback needs to compute the value
- **callback**: A function that receives the object (including `id` and all `dependsOn` fields) and returns the computed value

When you select a virtual field in a query, only the computed value is returned—the dependency fields are not exposed unless you explicitly select them.

```ts
import { Wabe } from "wabe";

const run = async () => {
  const wabe = new Wabe({
    // ... others config fields
    schema: {
      classes: [
        {
          name: "Person",
          fields: {
            firstName: { type: "String" },
            lastName: { type: "String" },
            age: { type: "Int" },
            fullName: {
              type: "Virtual",
              returnType: "String",
              dependsOn: ["firstName", "lastName"],
              callback: (object) =>
                `${object.firstName} ${object.lastName}`.trim(),
            },
            isAdult: {
              type: "Virtual",
              returnType: "Boolean",
              dependsOn: ["age"],
              callback: (object) => (object.age ?? 0) >= 18,
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

Indexes improve query performance by creating optimized data structures for specific fields. When defining indexes, you specify:

- **field**: The field name to index
- **order**: Sort order (ASC for ascending, DESC for descending)
- **unique**: Whether the index should enforce uniqueness (optional)

Indexes are automatically created when your application starts and the database is initialized.

```ts
import { Wabe } from "wabe";

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

Wabe provides fine-grained permission control for each class through its permission system. You can configure access rights for all CRUD operations:

- **create**: Who can create new objects
- **read**: Who can view existing objects  
- **update**: Who can modify existing objects
- **delete**: Who can remove objects

For each operation, you can specify:
- **requireAuthentication**: Whether users must be authenticated
- **authorizedRoles**: Specific roles that have permission (optional)

Permissions are enforced at both the GraphQL API level and when using the DatabaseController directly.

```ts
import { Wabe } from "wabe";

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

Wabe's search functionality enables efficient full-text searching across your data. When you mark fields as searchable, Wabe automatically:

1. Creates a `search` field in your class
2. Generates search tokens for each searchable field
3. Updates these tokens whenever data changes

For example, the word "test" generates tokens ["t", "te", "tes", "test"], allowing partial matches. The original field content remains unchanged in the database.

Search is optimized for performance and can be accessed through the GraphQL API using specialized search queries.

```ts
import { Wabe } from "wabe";

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
