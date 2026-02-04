<p align="center">
  <a href="https://palixir.github.io/wabe/"><img src="https://palixir.github.io/wabe//assets/logo.png" alt="Wabe logo" height=170></a>
</p>

<div align="center">
  <a href="https://palixir.github.io/wabe/">Documentation</a>
</div>

## What is Wabe?

Wabe is an open-source backend as a service that allows you to create your own fully customizable backend in just a few minutes. It handles database access, automatic GraphQL API generation, authentication with various methods (classic or OAuth), permissions, security, and more for you.

## Install for wabe-mongodb-launcher

```sh
bun install wabe # On bun
npm install wabe # On npm
yarn add wabe # On yarn

bun install wabe-mongodb-launcher # On bun
npm install wabe-mongodb-launcher # On npm
yarn add wabe-mongodb-launcher # On yarn
```

## Basic example of wabe-mongodb-launcher usage

```ts
import { runDatabase } from 'wabe-mongodb-launcher'

await runDatabase()
```
