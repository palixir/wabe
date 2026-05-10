# Mutex

Wabe provides a database-backed mutex controller to coordinate concurrent operations across multiple server instances.

You can use it through `wabe.controllers.mutex` with three methods:
- `lockMutex(name: string): Promise<boolean>`
- `unlockMutex(name: string): Promise<boolean>`
- `getMutexStatus(name: string): Promise<boolean>`

## Behavior

- `lockMutex` uses an atomic compare-and-set under the hood.
- `unlockMutex` also uses an atomic compare-and-set.
- methods return `true` when the state transition is applied, `false` otherwise.
- mutex state is persisted in the internal `_Mutex` class.
- `_Mutex` is root-only (create/read/update/delete).

## Example

```ts
import { Wabe } from "wabe";

const run = async () => {
  const wabe = new Wabe({
    // ... other config fields
  });

  await wabe.start();

  const mutexName = "daily-billing-sync";
  const acquired = await wabe.controllers.mutex.lockMutex(mutexName);

  if (!acquired) {
    // Another process already runs this job
    return;
  }

  try {
    // Critical section
    // run your job here
  } finally {
    await wabe.controllers.mutex.unlockMutex(mutexName);
  }
};

await run();
```

## Notes

- choose deterministic names (for example `feature:userId`).
- always release in a `finally` block.
- if lock acquisition fails, decide explicitly whether to fail fast or retry in your own logic.
