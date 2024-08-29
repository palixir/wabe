# Hooks

## Why a hook system ?

Wabe includes a `Hook` system that allows you to perform actions before or after any type of request (`read`, `create`, `update`, `delete`). This is particularly useful for executing mandatory actions before a request, such as checking the user's permissions, modifying the data to be inserted into the database, or adding fields like updatedAt or createdAt.

You can also perform actions as a consequence of a request (i.e., after it has been executed). For example, you might send a welcome email after each new user is added.

The Hook system is similar to triggers found in some SQL databases.

## How it works ?

In Wabe's configuration, you can define an array of hooks. Each hook can include the className that will trigger the hook (if not defined, the hook will be triggered for all classes).

You can set the hook's `priority`. This allows parallel execution of all hooks with the same priority, avoiding a sequential tunnel of hooks. Hooks with the lowest priority will run first. Priority 0 is reserved for Wabe's internal use and is not available for general use.

Next, you must define the `operation type` (`BeforeCreate`, `AfterCreate`, `BeforeUpdate`, `AfterUpdate`, etc.).

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
