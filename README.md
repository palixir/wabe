<p align="center">
  <a href="https://wabe.dev"><img src="https://www.wabe.dev/logo.png" alt="Wabe logo" height=170></a>
</p>
<h1 align="center">Wabe</h1>

<div align="center">
  <a href="https://wabe.dev">Documentation</a>
</div>

## What is Wabe?

Wabe is an open-source backend that allows you to create your own fully customizable backend in just a few minutes. It handles database access, automatic GraphQL API generation, authentication with various methods (classic or OAuth), permissions, security, and more for you.

## Install

```sh
bun install wabe # On bun
npm install wabe # On npm
yarn add wabe # On yarn
```

## Basic example

```ts
import { DatabaseEnum, Wabe } from "wabe";

const run = async () => {
  // Ensure your database is running before run the file

  const wabe = new Wabe({
    // Root key example (must be long minimal 64 characters, you can generate it online)
    rootKey:
      "0uwFvUxM$ceFuF1aEtTtZMa7DUN2NZudqgY5ve5W*QCyb58cwMj9JeoaV@d#%29v&aJzswuudVU1%nAT+rxS0Bh&OkgBYc0PH18*",
    database: {
      type: DatabaseEnum.Mongo,
      url: "mongodb://127.0.0.1:27045",
      name: "WabeApp",
    },
    port: 3000,
  });

  await wabe.start();
};

await run();
```

## Features

- **Authentication**: Secure and scalable authentication for your applications.
- **Permissions**: Granular permissions control to secure your resources.
- **Database**: A powerful, scalable database to store and manage you data.
- **GraphQL API**: A flexible and powerful GraphQL API (following GraphQL Relay standard) to interact with your data.
- **Hooks**: Powerful hooks system to execute custom actions before or after database requests.

## Contributing

Contributions are always welcome! If you have an idea for something that should be added, modified, or removed, please don't hesitate to create a pull request (I promise a quick review).

You can also create an issue to propose your ideas or report a bug.

Of course, you can also use Wabe for your backend; that is the better contribution at this day ❤️.

If you like the project don't forget to share it.

More informations on the [Contribution guide](https://github.com/palixir/wabe/blob/main/CONTRIBUTING.md)

## License

Distributed under the Apache License 2.0 [License](https://github.com/palixir/wabe/blob/main/LICENSE).
