# GraphQL API

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

Queries and mutations that return multiple objects will return a `Connection` object (a standard GraphQL type see the doc [here](https://graphql.org/learn/pagination/#complete-connection-model)). In this object, you will find a `count` field that returns the total number of items matching your query (this can be used in a pagination system to return the total number of results in the database that match your query). You will also find the `edges` object, with `nodes` containing all the fields of the retrieved object.

```graphql
type CompanyConnection {
  count: Int
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

## Pagination

As you may have noticed in the query that retrieves multiple objects, you have the option to define an `offset`, which corresponds to the number of results from which you want to start retrieving. You can also specify a `first` number of items to retrieve. The `offset` and `first` fields are **GraphQL Relay** compliant.

For example, in a query with a `where` clause that retrieves a total of 100 results, if you set an `offset` of 20 and a `first` of 10, you will retrieve items from the twentieth to the thirtieth.

```graphql
companies(where: CompanyWhereInput, offset: Int, first: Int): CompanyConnection!
```

## Search
