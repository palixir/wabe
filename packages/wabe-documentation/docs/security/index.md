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

## Object level permissions (OLP)

`Object-level permissions` are much more granular. They allow, for example, an object to be read, modified, or deleted only by one or more specific users. A very simple use case is to prevent the deletion of a user by anyone except the user themselves.

Unlike class-level permissions, defining `object-level permissions` requires manual handling (we are considering ways to manage this with a relatively modular configuration).

Here is an example of a `hook` that can be created to set acl on the class `Company` before creation.

```ts
// Hook on class Company beforeCreate
const setAclOnCompany = async (hookObject: HookObject<any>) => {
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
