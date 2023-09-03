<p align="center">
  <a href="https://wobe.dev"><img src="https://www.wobe.dev/logo.png" alt="Logo" height=170></a>
</p>
<h1 align="center">Wobe</h1>

<div align="center">
  <a href="https://wobe.dev">Documentation</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="https://discord.gg/GVuyYXNvGg">Discord</a>
</div>

## What is Wobe apollo ?

**Wobe yoga** is a plugin for the **wobe** web framework that allows you to easily use the yoga graphql server.

## Install

```sh
bun install wobe-graphql-yoga # On bun
npm install wobe-graphql-yoga # On npm
yarn add wobe-graphql-yoga # On yarn
```

## Basic example

```ts
import { Wobe } from 'wobe'
import { WobeGraphqlYogaPlugin } from 'wobe-graphql-yoga'

const wobe = new Wobe().usePlugin(
	WobeGraphqlYogaPlugin({
		typeDefs: `
					type Query {
						hello: String
					}
				`,
		resolvers: {
			Query: {
				hello: () => 'Hello from Yoga!',
			},
		},
		maskedErrors: false, // You can mask the errors to have generic errors in production
	}),
)

wobe.listen(3000)
```
