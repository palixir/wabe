# Wabe

📚 **Documentation:** [https://palixir.github.io/wabe/index](https://palixir.github.io/wabe/index)

**Create your backend with no vendor lock-in**

Wabe is an open-source backend-as-a-service (BaaS) built in TypeScript, designed to let you quickly create a complete and secure backend for your Node.js / Bun apps.
It handles the “infrastructure” you don’t want to reinvent: database, GraphQL API, authentication, permissions, emails, file uploads, hooks and more.

---

## 🧭 Why Wabe?

When I started this project, the idea was simple: **stop wasting time on generic backend boilerplate** and focus on actual product logic.
Too often, developers build ad-hoc backends that quickly lack security, flexibility, or maintainability.

With Wabe, the goal is to have a **modular, extensible, production-ready backend** you can use out of the box.

Why Wabe might be interesting for you:

- ✅ **Productivity**: spin up a full backend in a few lines of code.
- ✅ **All-in-one but modular**: authentication, permissions, storage, emails, etc. Replace or extend as needed.
- ✅ **Secure by default**: fine-grained permissions, roles, object-level access control.
- ✅ **GraphQL API**: type-safe, auto-generated CRUD resolvers.
- ✅ **Hooks & events**: plug into operations without hacking the core.
- ✅ **Scalable**: built with real-world apps in mind.
- ✅ **Open source**: no vendor lock-in, fully transparent.

---

## ✨ Key Features

| Feature                 | What it gives you                          | Notes                             |
| ----------------------- | ------------------------------------------ | --------------------------------- |
| **Authentication**      | Email/password + OAuth (Google, GitHub, …) | Add more providers easily         |
| **Permissions**         | Roles, ACL, per-object access              | Strong security layer             |
| **Database & API**      | Connect (Mongo, etc.), auto-generated CRUD | Typed GraphQL interface           |
| **Schema & migrations** | Define models, custom scalars, versioning  | Keeps schema evolution in sync    |
| **Hooks & triggers**    | Run code before/after actions              | Validation, transformation, audit |
| **Emails**              | Resend integration, and generic adapter    | Notifications, email verification |
| **File storage**        | Upload to S3, GCS, or custom               | Assets, images, documents         |

---

## 🚀 Installation & Quick start

```bash
# with npm
npm install wabe-resend

# with yarn
yarn add wabe-resend

# with Bun
bun install wabe-resend
```

## 🎯 Basic example

```ts
import { Wabe } from "wabe";
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
    port: 3000,
  });

  await wabe.start();
};

await run();
```

Then, from your frontend, call the auto-generated GraphQL API:

```GraphQL
mutation createUsers($input: CreateUsersInput!) {
	createUsers(input: $input) {
		edges {
			node {
				id
				name
				age
				isAdmin
				floatValue
			}
		}
	}
}
```

## 🌱 Contributing

Contributions are always welcome! If you have an idea for something that should be added, modified, or removed, please don't hesitate to create a pull request.

You can also create an issue to propose your ideas or report a bug.

You can help in many ways:

- Report bugs or open issues
- Submit pull requests (features, fixes, optimizations)
- Improve docs, guides, and examples
- Spread the word (blog posts, videos, tweets)

Of course, you can also use Wabe for your backend ❤️.

If you like the project don't forget to share it.

More information on the [Contribution guide](https://github.com/palixir/wabe/blob/main/CONTRIBUTING.md)

## License

Distributed under the Apache License 2.0 [License](https://github.com/palixir/wabe/blob/main/LICENSE).
