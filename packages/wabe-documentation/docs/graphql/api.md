# GraphQL

One of the most important features of Wabe is its auto-generated GraphQL API. It allows you to interact with your database data very easily from either the frontend or backend, and in a fully typed manner (see [here](https://graphql.org/) to have more information about GraphQL advantage). Wabe GraphQL API follows **[GraphQL Relay](https://relay.dev/)** specifications.

## Auto generated API

For each class you define in the schema, 2 queries and 6 mutations will be automatically generated. These will allow you to perform basic interactions with your data, saving you considerable time as you won't need to create each endpoint yourself. You'll have one query to retrieve a single object and another to retrieve N objects. Additionally, there will be mutations to create, update, or delete a single object, as well as to create, update, or delete N objects. With these 8 GraphQL endpoints, you'll be able to cover many basic needs.

Here is the header for these auto-generated endpoints for the classe `Company`:

```graphql
# Queries
company(id: ID!): Company
companies(where: CompanyWhereInput, offset: Int, first: Int): CompanyConnection!

# Mutations
createCompany(input: CreateCompanyInput): CreateCompanyPayload
createCompanies(input: CreateCompaniesInput): CompanyConnection!

updateCompany(input: UpdateCompanyInput): CreateCompanyPayload
updateCompanies(input: UpdateCompaniesInput): CompanyConnection!

deleteCompany(input: DeleteCompanyInput): DeleteCompanyPayload
deleteCompanies(input: DeleteCompaniesInput): CompanyConnection!
```

## Connections

Queries and mutations that return multiple objects will return a `Connection` object (a standard GraphQL type see the doc [here](https://graphql.org/learn/pagination/#complete-connection-model)). In this object, you will find a `totalCount` field that returns the total number of items matching your query (this can be used in a pagination system to return the total number of results in the database that match your query). You will also find the `edges` object, with `nodes` containing all the fields of the retrieved object.

```graphql
type CompanyConnection {
  totalCount: Int
  edges: [CompanyEdge]
}

type CompanyEdge {
  node: Company!
}

type Company {
  name: String!
}
```

## Where

For all queries or mutations that interact with multiple objects, you will have the option to define a `where` object to specify the criteria for selecting the objects you want to retrieve from your database. All scalars supported by default by Wabe have a `WhereInput` with all the necessary fields to interact with the data. Here is an example of a `CompanyWhereInput`:

```graphql
"""Company class"""
input CompanyWhereInput {
  id: IdWhereInput
  name: StringWhereInput
  createdAt: DateWhereInput
  updatedAt: DateWhereInput
  OR: [UserWhereInput]
  AND: [UserWhereInput]
}

// Example of one default Wabe WhereInput (String scalar)
input StringWhereInput {
  equalTo: String
  notEqualTo: String
  in: [String]
  notIn: [String]
}

// Example of one default Wabe WhereInput (Int scalar)
input IntWhereInput {
  equalTo: Int
  notEqualTo: Int
  lessThan: Int
  lessThanOrEqualTo: Int
  greaterThan: Int
  greaterThanOrEqualTo: Int
  in: [Int]
  notIn: [Int]
}
```

## Order

You can also define an `order` object to specify the order of the results. This object will be used to sort the results according to the fields you specify. You can specify multiple fields to sort by, and you can also specify the order (ascending or descending). Here is an example of an `OrderInput`:

```graphql
enum CompanyOrder {
  name_ASC
  name_DESC
}
```

You can use it like this in a GraphQL query:

```graphql
query companies {
  companies(
      order: [name_ASC]
  ) {
    edges {
      node {
        id
      }
    }
  }
}
```

## Pagination

As you may have noticed in the query that retrieves multiple objects, you have the option to define an `offset`, which corresponds to the number of results from which you want to start retrieving. You can also specify a `first` number of items to retrieve. The `offset` and `first` fields are **GraphQL Relay** compliant.

For a good pagination, it's recommend to use `totalCount` to get the total number of elements instead of getting the length of the `edges` object. `totalCount` represents the total number of results that are corresponding to your request. Edges only corresponds to the objects returns with `offset` and `first` consideration.

For example, in a query with a `where` clause that retrieves a total of 100 results, if you set an `offset` of 20 and a `first` of 10, you will retrieve items from the twentieth to the thirtieth.

```graphql
companies(where: CompanyWhereInput, offset: Int, first: Int): CompanyConnection!
```

## Search

In the `WhereInput`, you also have the option to perform a specific search on a term or a fragment of a term. This search will be conducted on the `searchableFields` you have defined in your schema. If you add other criteria in the `WhereInput`, these will combine with the search (similar to an AND operation). You can use it like this :

```graphql
query companies {
  companies(
    # Here main user is an additional condition on a Pointer
    where: {search: {contains: "Comp"}, mainUser: {email: {equalTo: "contact@email.com"}}}
  ) {
    edges {
      node {
        id
      }
    }
  }
}
```

## Pointer

As mentioned during the schema creation, you can also interact with `Pointer` fields from the GraphQL API very easily. To access them in a query, you can simply request it as if it were an object within your object (see the example below).

For creation, you have several options: either the object you want to link to already exists, or it doesn't, and you can create it on the fly (which saves you from making an additional create request). You can do both in one go. The examples below illustrate these two cases.

**Note :** You can do the same things on the `update` mutations.

```graphql
query company {
  company(id: "companyId") {
    # Here mainUser is a Pointer to the class User
    mainUser {
      lastName
      firstName
    }
  }
}
```

Case where the user doesn't exist :

```graphql
mutation createCompany {
  # Here the user with id userId already exist so we just link the new company to this user
  createCompany(input: {fields: {name: "companyName", mainUser: {link: "userId"}}}) {
    company {
      id
      mainUser {
        lastName
      }
    }
  }
}
```

Case where the user doesn't exist :

```graphql
mutation createCompany {
  createCompany(
    # Here the user doesn't exist so we create it and link to the new company
    input: {fields: {name: "companyName", mainUser: {createAndLink: {lastName: "lastName", firstName: "firstName"}}}}
  ) {
    company {
      id
      mainUser {
        lastName
        firstName
      }
    }
  }
}
```

Case where you want to unlink an object from the `Pointer`:

**Note :** When you `unlink` a pointer if you request the field in the query, it will **throw** an error `Object not found` because no object is link anymore to the object.

```graphql
mutation updateCompany {
  updateCompany(
    id: "companyIdToUpdate"
    # Here we want to unlink the mainUser from the Pointer
    input: {fields: {mainUser: {unlink : true}}}
  ) {
    company {
      id
      # Notice this request will throw an error Object not found since the mainUser
      # object doesn't link anymore to this company
      mainUser {
        lastName
        firstName
      }
    }
  }
}
```

## Relation

Like for the `Pointer` you can add one or multiple object on `Relation` (with add / createAndAdd). You can also `remove` one or multiple objects from the `Relation`.

**Note :** You can do the same things on the `update` mutations.

```graphql
query company {
  company(id: "companyId") {
    # Here mainUsers is a Relation to the class User
    mainUsers {
      edges {
        node {
          lastName
          firstName
        }
      }
    }
  }
}
```

Case where the user doesn't exist :

```graphql
mutation createCompany {
  # Here the user with id userId1 and userId2 already exist so we just link the new company to this user
  createCompany(input: {fields: {name: "companyName", mainUsers: {add: ["userId1", "userId2"]}}}) {
    company {
      id
      mainUsers {
        edges {
          node {
            lastName
            firstName
          }
        }
      }
    }
  }
}
```

Case where the user doesn't exist :

```graphql
mutation createCompany {
  createCompany(
    # Here the user doesn't exist so we create it and add to the new company
    input: {fields: {name: "companyName", mainUsers: {createAndAdd: [{lastName: "lastName", firstName: "firstName"}]}}}
  ) {
    company {
      id
      mainUsers {
        edges {
          node {
            lastName
            firstName
          }
        }
      }
    }
  }
}
```

Case where you want to remove an object from the `Relation`:

```graphql
mutation updateCompany {
  updateCompany(
    id: "companyIdToUpdate"
    # Here we want to remove the userIdToRemove from the relation
    input: {fields: {mainUsers: {remove: ["userIdToRemove"]}}}
  ) {
    company {
      id
      mainUsers {
        edges {
          node {
            lastName
            firstName
          }
        }
      }
    }
  }
}
```

## File upload

Wabe's GraphQL API offers a way to `upload` files into the database. It uses the specifications written by Jayden Seric (link [here](https://github.com/jaydenseric/graphql-multipart-request-spec)) in the absence of an official specification. These specifications are supported by GraphQL Yoga, among others. As detailed in the schema section, you have the ability to define your own file adapter, which is invoked when a mutation that receives a file as a parameter is used. A common procedure inside this adapter is to upload the file to a bucket and return the URL of that file. Note that the element returned by the adapter function corresponds to the value that will be stored in the database.

This uses a multipart form; an example of its usage is provided below.

```ts
const formData = new FormData();

formData.append(
  "operations",
  JSON.stringify({
    query: `mutation ($logo: File!) {
        updateCompany(input: {id: \"companyId\", fields: {logo: $logo}}) {
          company {
            id
            logo
          }
        }
      }`,
    variables: { logo: null },
  }),
);

formData.append("map", JSON.stringify({ 0: ["variables.logo"] }));

formData.append("0", new File(["a"], "a.text", { type: "text/plain" }));

const res = await fetch("http://127.0.0.1:3000/graphql", {
  method: "POST",
  body: formData,
});
```

Example of adapter implementation in schema :

```ts
new Wabe({
  // ... others config fields
  file: {
    adapter: async (file) => {
      // ... Upload the file on a bucket

      // return the url of the file for example (this url will be store in the database)
      return "http://bucket.storage/123456/logo.png";
    },
  },
});
```
