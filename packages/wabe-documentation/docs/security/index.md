# Permissions

Wabe allows you to manage permissions at multiple levels to achieve maximum granularity. You can manage them at the class level or at the object level.

## Class level permissions (CLP)

When configuring your class, you have the option to set specific access `permissions` for that class. These permissions allow you to specify rights for `creating`, `updating`, `deleting`, and `reading` the class data. For each of the four CRUD operations, you can define whether authentication is required to perform the operation and which roles are authorized to execute it for more granular control.

Here is an exempla of permissions settings for `Company` classes.

`Class-level permissions` are managed automatically by Wabe; you only need to define your class configuration as shown in the example below.

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

## Access control lists (ACL)

`Access control lists` are much more granular. They allow, for example, an object to be read, modified, or deleted only by one or more specific users. A very simple use case is to prevent the deletion of a user by anyone except the user themselves.

To define an `access control list` you can use the default configuration that Wabe provides. It should cover most of the use cases but let know if you need something more specific. Here is an example :

```ts
import { Wabe } from "wabe";
import { RoleEnum } from "../generated/wabe";

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
              authorizedRoles: ["Admin"],
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
            acl: async (hookObject) => {
              // The user that creataed the company is authorized to read and write it
              await hookObject.addACL('users', {
                userId: hookObject.context.user?.id,
                read: true,
                write: true,
              })

              // No roles are authorized to read or write the company
              await hookObject.addACL('roles', null)
              // Or you can specify a role
              await hookObject.addACL('roles', {
                role: RoleEnum.Admin,
                read: true,
                write: true,
              })
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
    // Array of roles with acces on read and write for each one
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
