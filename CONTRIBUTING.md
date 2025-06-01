# Contribution Guidelines

Contributions are welcome! Here's how you can help:

- **Report a bug**: If you find a bug, please open an issue.
- **Request a feature**: If you have an idea for a feature, please open an issue.
- **Create a pull request**: If you can fix a bug or implement a feature, please create a pull request (I promise a quick review).
- **Use Wabe**: The best way to contribute is to use Wabe for your backend.

Note: Each code contribution must be tested either by an existing test or a new one.

## Note about new PR

First of all, thank you for taking the time to improve Wabe. Wabe has a great test coverage, to keep this code quality, please add tests that cover your changes 🙂.

## Requirement

Wabe supports two types of databases: MongoDB and PostgreSQL. Since PostgreSQL is faster, it is the one we use in our tests. To run the tests, you need to have Docker installed and running on your machine. The launch scripts will take care of downloading the PostgreSQL image and creating a container before running the tests. More information can be found in the `wabe-postgres-launcher` or `wabe-mongodb-launcher` packages.

## Install

Wabe uses Bun, so you need the latest version of Bun. You can see [here](https://bun.sh/docs/installation) if Bun is not installed on your machine.

Wabe uses a monorepo organization, all the packages are under the `packages` directory.

Once you have cloned the repository you can run the following command at the root of the project.

```sh
bun install
```

You can run the tests in all packages by running the following commands at the root repository:

```sh
cd packages/wabe
bun dev # Run server and create all codegen

bun test # Run test on wabe package
# or
bun ci # Run lint + test on package
```

## Pre-commit

Before any commit a pre-commit command that will run on your machine to ensure that the code is correctly formatted and the lint is respected. If you have any error of formatting during the pre-commit you can simply run the following command (at the root of the repository):

Wabe repository also uses the conventional commits to ensure consistence and facilitate the release. Your PRs and your commits need to follow this convention. You can see here to see more information about [Conventional commits](https://www.conventionalcommits.org/en/v1.0.0/).

```sh
bun format
```
