# Permissions

Wabe allows you to manage permissions at multiple levels to achieve maximum granularity. You can manage them at the class level or at the object level.

## Class level permissions (CLP)

When configuring your class, you have the option to set specific access `permissions` for that class. These permissions allow you to specify rights for `creating`, `updating`, `deleting`, and `reading` the class data. For each of the four CRUD operations, you can define whether authentication is required to perform the operation and which roles are authorized to execute it for more granular control.

Here is an exempla of permissions settings for `Company` classes.

`Class-level permissions` are managed automatically by Wabe; you only need to define your class configuration as shown in the example below.

```ts
import { Wabe } from "wabe";
import { RoleEnum } from "../generated/wabe";

const run = async () => {
  const wabe = new Wabe({
    // ... other configuration fields
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
              authorizedRoles: [RoleEnum.Admin],
              requireAuthentication: true,
            },
            read: {
              requireAuthentication: false,
            },
            update: {
              requireAuthentication: true,
              authorizedRoles: [RoleEnum.Admin],
            },
            delete: {
              requireAuthentication: true,
              authorizedRoles: [RoleEnum.Admin],
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

## Access control lists (ACL)

`Access control lists` are much more granular. They allow, for example, an object to be read, modified, or deleted only by one or more specific users. A very simple use case is to prevent the deletion of a user by anyone except the user themselves.

To define an `access control list` you can use the default configuration that Wabe provides. It should cover most of the use cases but let know if you need something more specific. Here is an example :

```ts
import { Wabe } from "wabe";
import { RoleEnum } from "../generated/wabe";

const run = async () => {
  const wabe = new Wabe({
    // ... other configuration fields
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
              authorizedRoles: [RoleEnum.Admin],
              requireAuthentication: true,
            },
            read: {
              authorizedRoles: [RoleEnum.Admin],
              requireAuthentication: false,
            },
            update: {
              requireAuthentication: true,
              authorizedRoles: [RoleEnum.Admin],
            },
            delete: {
              requireAuthentication: true,
              authorizedRoles: [RoleEnum.Admin],
            },
            acl: async (hookObject) => {
              // The user that creataed the company is authorized to read and write it
              await hookObject.addACL("users", {
                userId: hookObject.context.user?.id,
                read: true,
                write: true,
              });

              // No roles are authorized to read or write the company
              await hookObject.addACL("roles", null);
              // Or you can specify a role
              await hookObject.addACL("roles", {
                role: RoleEnum.Admin,
                read: true,
                write: true,
              });
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

If your use is more specific, you can create your own `hook` to set the acl on the class.

Here is an example of a `hook` that can be created to set acl on the class `Company` before creation.

```ts
// Hook on class Company beforeCreate
const setAclOnCompany = async (hookObject: HookObject<any, any>) => {
  hookObject.upsertNewData("acl", {
    // Array of users with access on read and write for each one
    users: [
      {
        userId: "userId",
        read: false,
        write: true,
      },
    ],
    // Array of roles with access on read and write for each one
    roles: [
      {
        roleId: "roleId",
        read: true,
        write: true,
      },
    ],
  });
};
```

## Protected Field

The `protected` field allows you to define additional restrictions on read (`read`) and update (`update`) operations for specific fields within a class. By using this field, you can specify which roles are authorized to perform these operations, providing more granular control over data access.

### Usage

To use the `protected` field, you need to define it in the configuration of your class fields. This field accepts an array of roles that are permitted to read or update the field.

### Example

Here is an example configuration using the `protected` field to restrict access to certain fields:

````typescript
import { Wabe } from "wabe";
import { RoleEnum } from "../generated/wabe";

const run = async () => {
  const wabe = new Wabe({
    // ... other configuration fields
    authentication: {
      roles: ["Admin", "Client", "rootOnly"],
    },
    schema: {
      classes: [
        {
          name: "Company",
          fields: {
            name: {
              type: "String",
              protected: {
                authorizedRoles: [RoleEnum.Admin, RoleEnum.Client], // Only Admin and Client roles can read or update this field
                protectedOperations: ["read", "update"], // Only read and update operations are allowed for this field
              }
            },
            sensitiveInfo: {
              type: "String",
              protected: {
                authorizedRoles: ["rootOnly"], // Only root can read or update field
                protectedOperations: ["read", "update"], // Only read and update operations are allowed for this field
              }
            },
          },
          permissions: {
            create: {
              authorizedRoles: [RoleEnum.Admin],
              requireAuthentication: true,
            },
            read: {
              requireAuthentication: false,
            },
            update: {
              requireAuthentication: true,
              authorizedRoles: [RoleEnum.Admin],
            },
            delete: {
              requireAuthentication: true,
              authorizedRoles: [RoleEnum.Admin],
            },
          },
        },
      ],
    },
  });

  await wabe.start();
};

await run();

### Explanation

- **`authorizedRoles: [RoleEnum.Admin, RoleEnum.Client]`**: This setting indicates that only users with the `Admin` or `Client` roles will be affected by the `protected` field.
- **`protectedOperations: ["read", "update"]`**: This setting indicates that only read and update operations will be blocked for the field.

### Use Cases

- **Protecting Sensitive Data**: Use the `protected` field to restrict access to sensitive information to specific roles.
- **Granular Control**: Provide finer control over read and update operations at the individual field level.

By incorporating the `protected` field into your configuration, you can enhance the security of your application by limiting access to critical data to authorized users only.

## CORS

Wabe allows you to configure Cross-Origin Resource Sharing (CORS) to control the access to your API. You can enable CORS by setting the `corsOptions` property in the `security` configuration object.

```ts
import { Wabe } from "wabe";

const run = async () => {
  const wabe = new Wabe({
    // ... other configuration fields
    security: {
      corsOptions: {
        origin: "http://localhost:3001",
        allowMethods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
        exposedHeaders: ["Content-Type", "Authorization"],
        credentials: true,
        maxAge: 60,
      },
    },
  });

  await wabe.start();
};

await run();
````

## Rate limiting

Rate limiting is a security feature that protects your API from abuse by limiting the number of requests a client can make within a given time window. When enabled, it applies to all endpoints including the GraphQL endpoint (`/graphql`), helping prevent denial-of-service attacks and ensuring fair resource usage.

### Configuration

Enable rate limiting by setting the `rateLimit` property in the `security` configuration object:

```ts
import { Wabe } from "wabe";

const run = async () => {
  const wabe = new Wabe({
    // ... other configuration fields
    security: {
      rateLimit: {
        interval: 60 * 1000, // Time window in milliseconds (e.g. 1 minute)
        numberOfRequests: 100, // Max requests allowed per interval per client
      },
    },
  });

  await wabe.start();
};

await run();
```

### Options

| Option | Type | Description |
|--------|------|-------------|
| `interval` | `number` | The time window in milliseconds during which requests are counted |
| `numberOfRequests` | `number` | The maximum number of requests allowed per client within the interval |

### Behavior

- The limit is applied **per client** (typically identified by IP address)
- When a client exceeds the limit, subsequent requests receive an **HTTP 429 (Too Many Requests)** response
- The counter resets at the end of each interval

### Example: Strict rate limit for sensitive endpoints

For APIs that need stricter protection, use a lower limit:

```ts
security: {
  rateLimit: {
    interval: 60 * 1000, // 1 minute
    numberOfRequests: 10, // 10 requests per minute
  },
},
```

### Best practices

- **Production**: Use reasonable limits (e.g. 100–200 requests per minute) to balance protection and usability
- **Public APIs**: Consider stricter limits to prevent abuse
- **Authentication endpoints**: Rate limiting helps mitigate brute-force attacks on login flows

## Hide sensitive error message

You can hide sensitive error messages, for example, to avoid leaking any information to an attacker during the authentication process.

```ts
import { Wabe } from "wabe";

const run = async () => {
  const wabe = new Wabe({
    // ... other configuration fields
    security: {
      hideSensitiveErrorMessage: true,
    },
  });

  await wabe.start();
};

await run();
```

## CSRF Protection

Wabe provides built-in CSRF (Cross-Site Request Forgery) protection for cookie-based sessions. This security feature helps prevent unauthorized actions from being performed on behalf of authenticated users.

CSRF protection is automatically enabled when using cookie-based sessions (`cookieSession: true`). Wabe generates and validates CSRF tokens to ensure that requests originate from your legitimate application and not from malicious sites.

### Basic Configuration

```ts
import { Wabe } from "wabe";

const run = async () => {
  const wabe = new Wabe({
    // ... other configuration fields
    authentication: {
      session: {
        cookieSession: true, // Enables CSRF protection
        csrfSecret: "your-custom-csrf-secret-key", // Optional: Custom secret
      },
    },
    security: {
      disableCSRFProtection: false, // Default: protection enabled
    },
  });

  await wabe.start();
};

await run();
```

> ⚠️ **Security Warning**: Disabling CSRF protection (`disableCSRFProtection: true`) is not recommended for production environments.

For complete details about how CSRF protection works, frontend integration, token format, validation process, and best practices, refer to the [Sessions documentation](/documentation/authentication/sessions#csrf-protection).
