# Database

We have seen that Wabe offers a very rich GraphQL API for interacting with the data stored in the database. There is also another way, using the `DatabaseController` directly to execute your queries. This controller is accessible within the `WabeContext` (`context.wabe.controllers.database`).

**Note:** It is important to note, that the `DatabaseController` does not provide interfaces for interacting with "search," or with pointers and relations as offered by the GraphQL API.

## Queries

You have the ability to retrieve one or multiple objects that match specific selection criteria. The fields parameter allows you to specify which `fields` of the object you want to retrieve.

### Query one object

```ts
const { id } = await context.wabe.controllers.database.getObject({
  className: "User",
  context,
  fields: ["id"],
  id: "userId",
});
```

### Query multiple objects

```ts
const res = await context.wabe.controllers.database.getObjects({
  className: "User",
  context,
  fields: ["id", "name"],
  where: { id: { equalTo: "userId" } },
});

const user = res[0];
```

### Count the number of results

```ts
const numberOfUser = await context.wabe.controllers.database.count({
  className: "User",
  context,
  where: { age: { equalTo: 20 } },
});
```

## Mutations

You also have the ability to create / update / delete one or multiple object as you can do with `GraphQL API`.

### Create one object

```ts
const { id } = await wabe.controllers.database.createObject({
  className: "User",
  context,
  data: { name: "Lucas" },
  fields: ["id"],
});
```

### Create multiple objects

```ts
const res = await wabe.controllers.database.createObjects({
  className: "User",
  context,
  data: [{ name: "Lucas" }],
  fields: ["id"],
});
```

### Update one object

```ts
const { name } = await context.wabe.controllers.database.updateObject({
  className: "User",
  context,
  fields: ["name"],
  id: "userId",
  data: { age: 20 },
});
```

### Update multiple objects

```ts
await context.wabe.controllers.database.updateObjects({
  className: "User",
  context,
  fields: ["name"],
  where: { name: { equalTo: "test" } },
  data: { age: 20 },
});
```

### Delete one object

```ts
await wabe.controllers.database.deleteObject({
  className: "User",
  id: "userId",
  context,
  fields: [],
});
```

### Delete multiple object

```ts
await wabe.controllers.database.deleteObjects({
  className: "User",
  where: { name: { equalTo: "Lucas" } },
  context,
  fields: [],
});
```
