# Quick Start

Get your Wabe backend up and running in minutes! This guide will walk you through creating a new project, installing dependencies, and launching your first server.

---

## 1. Create a backend project

We'll start with a fresh backend project. For simplicity—and because Wabe was built with it—we'll use **Bun**, but Wabe is fully compatible with **Node.js** as well.

### Install Bun

Follow the instructions [here](https://bun.sh/docs/installation#installing) or run:

```sh
# macOS / Linux
brew install oven-sh/bun/bun

# Windows
npm install -g bun
```

### Initialize the project

Create a new project:

```sh
bun init
```

You should now have a basic project structure with an index.ts file.

## 2. Install Wabe

Add Wabe and the MongoDB launcher:

```sh
bun add wabe wabe-mongodb
bun add --dev wabe-mongodb-launcher
```

## 3. Create your first Wabe app

Open `index.ts and paste the following code:

```typescript
import { Wabe } from "wabe";
import { MongoAdapter } from "wabe-mongodb";
import { runDatabase } from "wabe-mongodb-launcher";

const run = async () => {
  await runDatabase();

  const wabe = new Wabe({
    isProduction: process.env.NODE_ENV === "production",
    rootKey: "YOUR_LONG_SECRET_ROOT_KEY_HERE",
    database: {
      adapter: new MongoAdapter({
        databaseName: "WabeApp",
        databaseUrl: "mongodb://127.0.0.1:27045",
      }),
    },
    port: 3001,
    schema: {
      classes: [],
      scalars: [],
      enums: [],
      resolvers: {
        queries: {},
        mutations: {},
      },
    },
  });

  await wabe.start();
};

await run();
```

### How It Works

- **`rootKey`**: A secret string that grants full access to your API via the `Wabe-Root-Key` header. Keep it safe and never expose it to the frontend.
- **`database`**: Configure your database adapter. Currently, Wabe supports MongoDB (Postgres coming soon!).
- **`port`**: The port your server will run on.
- **`schema`**: Define your backend structure—classes, enums, scalars, and resolvers. We'll explore this in detail in the Schema section.

Run your server:

```sh
bun run index.ts
```

---

## 4. Explore the GraphQL Dashboard

Visit: http://localhost:3001/graphql

You'll see **GraphiQL**, an interactive playground for testing queries and mutations. Click **"Show documentation explorer"** in the top-left corner to view all available queries and types.

![GraphQL Playground](/graphqlPlayground.webp)

Wabe comes with three default classes:

1. **User** – Handles authentication and user data
2. **Session** – Manages user sessions
3. **Role** – Stores roles automatically added to `RoleEnum`

For each class you define, Wabe automatically generates **2 queries and 6 mutations** to interact with your data.

![GraphQL Playground with all default resolvers](/graphqlPlayground2.webp)
