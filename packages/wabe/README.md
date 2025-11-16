<p align="center">
  <h1 align="center">Wabe</h1>
  <p align="center">🚀 A fully open-source <strong>Firebase alternative</strong> built in TypeScript</p>
</p>

<p align="center">
  <a href="https://github.com/palixir/wabe"><img src="https://img.shields.io/github/stars/palixir/wabe?style=flat-square" /></a>
  <a href="https://www.npmjs.com/package/wabe"><img src="https://img.shields.io/npm/v/wabe?style=flat-square" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-green?style=flat-square" /></a>
</p>

---

Wabe is a modern, batteries-included backend-as-a-service designed for developers who want the flexibility of self-hosting with the ease of Firebase.

You define your models → Wabe instantly generates:
- a **secure GraphQL API**
- **auth**, **permissions**, **hooks**, **emails**, **files**, and more
- a fully extensible backend written in clean TypeScript

No vendor lock-in. No hidden limits.  
Host it anywhere.

📚 **Documentation:** [https://palixir.github.io/wabe](https://palixir.github.io/wabe)

---

# ✨ Features

| Feature                  | Description                                                                 |
|--------------------------|-----------------------------------------------------------------------------|
| 🔐 Authentication        | Email/password, OTP, OAuth (Google, GitHub), password reset, email verification |
| 🔑 Permissions           | Fine-grained access control at collection, object, and field levels with secure defaults |
| ⚡ Auto-generated GraphQL | Fully typed CRUD GraphQL API generated from your schema, ready for production |
| 🔄 Hooks                  | Custom logic before/after create, update, delete, and read operations      |
| 📨 Email providers        | Resend (official adapter) or custom adapters                                |
| 🗄️ Database adapters      | MongoDB, PostgreSQL (official), or your own adapter                          |
| 📦 Modular architecture   | Replaceable and extensible modules: auth, storage, email, database, permissions |
| 🌍 Self-host anywhere     | Docker, Node, Bun, Fly.io, Render, Railway, Hetzner, Raspberry Pi           |


---

# 🚀 Quickstart

### 1. Install

```bash
npm install wabe
# or
bun add wabe
```

### 2. Create your schema and start your server

``` ts
import { Wabe } from "wabe";
import { MongoAdapter } from "wabe-mongodb";

const run = async () => {
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
    schema: {
      classes: [
        {
          name: 'User',
          description: 'User class',
          fields: {
            name: {
              type: 'String',
            },
            age: {
              type: 'Int',
            },
            email: {
              type: 'Email',
              required: true,
            },
          },
        },
      ]
    },
    port: 3000,
  });

  await wabe.start();
};

await run();
```

### 3. Query your API

``` graphql
mutation createUser {
  createUser(input: { fields: {name: "Wabe", email: "mybackend@wabe.com", age: 10} }) {
      user {
        id
        name
      }
  }
}
```


# 🧩 Official Templates

Wabe comes with a set of official templates to help you bootstrap projects instantly:

| Template               | Stack          | Description                     | Status         |
|------------------------|----------------|---------------------------------|----------------|
| **wabe-starter**       | Wabe + Node    | Minimal starter backend         | 🟡 Coming soon   |
| **wabe-next-template** | Next.js + Wabe | Authentication + CRUD boilerplate | 🟡 Coming soon |
| **wabe-saas-kit**      | Wabe + Wobe    | SaaS starter kit with Stripe    | 🟡 Coming soon |

More templates are added regularly based on community needs.

---

# 🌱 Ecosystem

### **Wobe — Full-stack web framework**

Wobe is a lightweight, TypeScript-first full-stack framework designed to pair naturally with Wabe.  
For a seamless frontend + backend developer experience:

👉 https://github.com/palixir/wobe

### **GraphQL Server (coming soon)**

A modern, type-safe GraphQL server designed as a companion to Wabe.  
Optimized for DX, performance, and full extensibility.

---

# 🗺️ Roadmap

- [x] PostgreSQL adapter  
- [ ] Admin dashboard UI  
- [x] File storage adapters (S3, Cloudflare R2, etc.)  
- [ ] CLI (`wabe init`, `wabe generate`)  
- [ ] SaaS starter kit  
- [ ] Improved documentation  

---

# 🤝 Contributing

Contributions are welcome!  
Before opening a PR, check the `CONTRIBUTING.md` and join the community.

---

# ❤️ Sponsors

Wabe is 100% open-source and maintained in my free time.  
If you want to support development:

👉 **GitHub Sponsors:** https://github.com/sponsors/coratgerl  

**Sponsors receive:**  
- Access to a complete, fully tested boilerplate with an admin dashboard to manage users (Vite, Tailwind, Playwright, Wabe, Bun, GraphQL, etc.)  
- Your name featured in the `README.md`  

Your support helps keep Wabe sustainable and actively maintained, and allows me to continue creating new projects in my free time to help developers have solid backends with minimal effort.

---

# ⭐ Show your support

If you like the project, please consider starring the repository:
⭐ → It helps more than you think.