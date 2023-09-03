<p align="center">
  <a href="https://wobe.dev"><img src="https://www.wobe.dev/logo.png" alt="Logo" height=170></a>
</p>
<h1 align="center">Wobe</h1>

<div align="center">
  <a href="https://wobe.dev">Documentation</a>
  <span>&nbsp;&nbsp;•&nbsp;&nbsp;</span>
  <a href="https://discord.gg/GVuyYXNvGg">Discord</a>
</div>

## What is Wobe?

**Wobe** is a simple, fast, and lightweight web framework. Inspired by some web frameworks like Express, Hono, Elysia. It works on Node and Bun runtime.

Wobe is very fast but not focused on performance; it focuses on simplicity and ease of use. It's very easy to create a web server with Wobe.

## Install

```sh
bun install wobe # On bun
npm install wobe # On npm
yarn add wobe # On yarn
```

## Basic example

```ts
import { Wobe } from 'wobe'

const app = new Wobe()
	.get('/hello', (context) => context.res.sendText('Hello world'))
	.get('/hello/:name', (context) =>
		context.res.sendText(`Hello ${context.params.name}`),
	)
	.listen(3000)
```

## Features

-   **Simple & Easy to use**: Wobe respects the standard and provides a large ecosystem.
-   **Fast & Lightweight**: Wobe is one of the fastest web framework on Bun, and it has 0 dependencies (only 9,76 KB).
-   **Multi-runtime**: Wobe supports Node.js and Bun runtime.
-   **Easy to extend**: Wobe has an easy-to-use plugin system that allows extending for all your personal use cases.

## Benchmarks (on Bun runtime)

Wobe is one of the fastest web framework based on the [benchmark](https://github.com/SaltyAom/bun-http-framework-benchmark) of SaltyAom.

| Framework | Runtime | Average    | Ping       | Query     | Body      |
| --------- | ------- | ---------- | ---------- | --------- | --------- |
| bun       | bun     | 92,639.313 | 103,439.17 | 91,646.07 | 82,832.7  |
| elysia    | bun     | 92,445.227 | 103,170.47 | 88,716.17 | 85,449.04 |
| wobe      | bun     | 90,535.37  | 96,348.26  | 94,625.67 | 80,632.18 |
| hono      | bun     | 81,832.787 | 89,200.82  | 81,096.3  | 75,201.24 |
| fastify   | bun     | 49,648.977 | 62,511.85  | 58,904.51 | 27,530.57 |
| express   | bun     | 31,370.06  | 39,775.79  | 36,605.68 | 17,728.71 |

_Executed with 5 runs - 12/04/2024_

## Contributing

Contributions are always welcome! If you have an idea for something that should be added, modified, or removed, please don't hesitate to create a pull request (I promise a quick review).

You can also create an issue to propose your ideas or report a bug.

Of course, you can also use Wobe in your application; that is the better contribution at this day ❤️.

If you like the project don't forget to share it.

More informations on the [Contribution guide](https://github.com/palixir/wobe/blob/main/CONTRIBUTING)

## License

Distributed under the MIT [License](https://github.com/palixir/wobe/blob/main/LICENSE).
