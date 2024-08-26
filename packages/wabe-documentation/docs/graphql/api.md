# GraphQL API

One of the most important features of Wabe is its auto-generated GraphQL API. It allows you to interact with your database data very easily from either the frontend or backend, and in a fully typed manner (see [here](https://graphql.org/) to have more information about GraphQL advantage).

## Auto generated API

For each class you define in the schema, 2 queries and 6 mutations will be automatically generated. These will allow you to perform basic interactions with your data, saving you considerable time as you won't need to create each endpoint yourself. You'll have one query to retrieve a single object and another to retrieve N objects. Additionally, there will be mutations to create, update, or delete a single object, as well as to create, update, or delete N objects. With these 8 GraphQL endpoints, you'll be able to cover many basic needs.

Here is the header for these auto-generated endpoints for the classe `Company`:

```graphql
# Queries
company(id: ID!): Company
compaanies(where: CompanyWhereInput, offset: Int, first: Int): CompanyConnection!

# Mutations
createCompany(input: CreateCompanyInput): CreateCompanyPayload
createCompanies(input: CreateCompaniesInput): CompanyConnection!

updateCompany(input: UpdateCompanyInput): CreateCompanyPayload
updateCompanies(input: UpdateCompaniesInput): CompanyConnection!

deleteCompany(input: DeleteCompanyInput): DeleteCompanyPayload
deleteCompanies(input: DeleteCompaniesInput): CompanyConnection!
```

## Types

### Where

### Pagination

### Search
