# Hooks

## Why a hook system ?

Wabe includes a `Hook` system that allows you to perform actions before or after any type of request (`read`, `create`, `update`, `delete`). This is particularly useful for executing mandatory actions before a request, such as checking the user's permissions, modifying the data to be inserted into the database, or adding fields like updatedAt or createdAt.

You can also perform actions as a consequence of a request (i.e., after it has been executed). For example, you might send a welcome email after each new user is added.

The Hook system is similar to triggers found in some SQL databases.

## How it works ?

In Wabe's configuration, you can define an array of hooks. Each hook can include the className that will trigger the hook (if not defined, the hook will be triggered for all classes).

You can set the hook's `priority`. This allows parallel execution of all hooks with the same priority, avoiding a sequential tunnel of hooks. Hooks with the lowest priority will run first. Priority 0 is reserved for Wabe's internal use and is not available for general use.

The operation type is a string that defines the type of operation that will be performed by the hook. The available operation types are:

- `BeforeCreate`: executed before a create request
- `AfterCreate`: executed after a create request
- `BeforeUpdate`: executed before an update request
- `AfterUpdate`: executed after an update request
- `BeforeDelete`: executed before a delete request
- `AfterDelete`: executed after a delete request

Finally, the `callback` contains the code executed by Wabe. This callback receives a parameter called hookObject, which provides access to elements like the user who initiated the request, the request context, and the ability to modify or add new data to the request during a create or update (upsertNewData), etc.

```ts
import { Wabe } from "wabe";

const run = async () => {
  const wabe = new Wabe({
    // ... others config fields
    hooks: [
      {
        className: "User",
        priority: 1,
        operationType: OperationType.BeforeCreate,
        callback: (hookObject) => {
          const isRoot = hookObject.context.isRoot;

          if (!isRoot) throw new Error("Permission denied");

          hookObject.upsertNewData("newField", "valueOfNewField");
        },
      },
    ],
  });

  await wabe.start();
};

await run();
```

## Hook object

The hook object contains the following properties:

- `context`: the request context
- `user`: the user who initiated the request
- `className`: the class name
- `object`: the object that will be created or updated
- `originalObject`: the object that will be created or updated before the mutation of the object (before a delete or before an update)

The hook object also contains the following methods:

- `upsertNewData(fieldName: string, value: any)`: this method allows you to add new data to the request during a create or update (upsertNewData), etc.
- `getUser(): User`: this method returns the user who initiated the request.
- `isFieldUpdatedd(fieldName: string): boolean`: this method returns true if the field has been updated during the request.
- `getNewData(): Record<string, any>`: this method returns the new data that has been added during the request.
- `fetchPointerOrRelation(field, options?): Promise<...>`: this method resolves a Pointer or Relation field on the current object from the database. The `field` argument is type-checked: only fields whose value is a Pointer (object with `id`) or a Relation (array of objects with `id`) are accepted. After the call, `hookObject.object[field]` is mutated to contain the fully resolved value, so subsequent reads (e.g. `hookObject.object.role.id`, `hookObject.object.role.name`) are available. An optional `select` lets you restrict which fields of the target class are loaded (e.g. `{ select: { name: true } }`); when omitted, all fields are returned. Calling it on a field that isn't a Pointer or Relation throws at runtime.

```ts
// On a User hook, resolve the `role` Pointer
await hookObject.fetchPointerOrRelation("role");
console.log(hookObject.object.role.id, hookObject.object.role.name);

// Restrict the loaded fields
await hookObject.fetchPointerOrRelation("role", { select: { name: true } });
```

```ts
import { Wabe } from "wabe";

const run = async () => {
  const wabe = new Wabe({
    // ... others config fields
    hooks: [
      {
        className: "User",
        priority: 1,
        operationType: OperationType.BeforeCreate,
        callback: (hookObject) => {
          const isRoot = hookObject.context.isRoot;

          if (!isRoot) throw new Error("Permission denied");

          hookObject.upsertNewData("newField", "valueOfNewField");
        },
      },
    ],
  });

  await wabe.start();
};

await run();
```

## Example

Here is an example of a hook that insert a new field `newField` with the value `valueOfNewField` before creating a new user.

```ts
import { Wabe } from "wabe";

const run = async () => {
  const wabe = new Wabe({
    // ... others config fields
    hooks: [
      {
        className: "User",
        priority: 1,
        operationType: OperationType.BeforeCreate,
        callback: (hookObject) => {
          hookObject.upsertNewData("newField", "valueOfNewField");
        },
      },
    ],
  });

  await wabe.start();
};

await run();
```
