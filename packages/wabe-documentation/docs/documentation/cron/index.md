# Crons

Wabe allows you to easily schedule recurring tasks with the integration of crons. You can configure tasks to run at specific intervals without manually managing their execution.

:::warning Warning:
The cron system is not designed to handle heavy background tasks. Tasks run on the main server, and heavy tasks could overload the server. Currently, Wabe does not support the management of heavy background tasks (lasting several minutes).
:::

## Configuration

To configure a cron in Wabe, you can use the `crons` option when initializing your Wabe instance. Here is an example configuration:

```ts
import { Wabe, cron, CronExpressions } from "wabe";
import { MongoAdapter } from "wabe-mongodb";

const run = async () => {
  // Ensure your database is running before run the file
  const wabe = new Wabe({
    isProduction: process.env.NODE_ENV === "production",
    // Root key example (must be long minimal 64 characters, you can generate it online)
    rootKey:
      "0uwFvUxM$ceFuF1aEtTtZMa7DUN2NZudqgY5ve5W*QCyb58cwMj9JeoaV@d#%29v&aJzswuudVU1%nAT+rxS0Bh&OkgBYc0PH18*",
    database: {
      adapter: new MongoAdapter({
        databaseName: "WabeApp",
        databaseUrl: "mongodb://127.0.0.1:27045",
      }),
    },
    crons: [
      {
        name: "test",
        cron: cron({
          pattern: "* * * * * *",
          run: (wabe) => console.log("test", wabe.config.port),
        }),
      },
    ],
    port: 3001,
  });

  await wabe.start();
};

await run();
```

## Usage

Crons can be used for various tasks, such as cleaning up the database, sending periodic notifications, or any other recurring task needed for your application.

- Pattern: The cron pattern follows the standard cron format, where each asterisk (\*) represents a unit of time (second, minute, hour, day of the month, month, day of the week).
- Run: The run function contains the code to be executed at each interval defined by the pattern.
