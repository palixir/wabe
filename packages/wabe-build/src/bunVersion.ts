import type { BunPlugin } from 'bun'
import { isolatedDeclaration } from 'oxc-transform'

// From https://github.com/oven-sh/bun/issues/5141
const getDtsBunPlugin = (): BunPlugin => {
  const wroteTrack = new Set<string>()
  return {
    name: 'oxc-transform-dts',
    setup(builder) {
      if (builder.config.root && builder.config.outdir) {
        const rootPath = Bun.pathToFileURL(builder.config.root).pathname
        const outPath = Bun.pathToFileURL(builder.config.outdir).pathname
        builder.onStart(() => wroteTrack.clear())
        builder.onLoad({ filter: /\.ts$/ }, async (args) => {
          if (args.path.startsWith(rootPath) && !wroteTrack.has(args.path)) {
            wroteTrack.add(args.path)
            const { code } = isolatedDeclaration(
              args.path,
              await Bun.file(args.path).text(),
            )
            await Bun.write(
              args.path
                .replace(new RegExp(`^${rootPath}`), outPath)
                .replace(/\.ts$/, '.d.ts'),
              code,
            )
          }
          return undefined
        })
      }
    },
  }
}

const directory = process.argv[2]
const target = process.argv[3] as 'node' | 'browser' | 'bun'

export const bunCompilation = async () => {
  await Bun.$`rm -rf ${directory}/dist`

  const result = await Bun.build({
    entrypoints: [`${directory}/src/index.ts`],
    root: `${directory}/src`,
    outdir: `${directory}/dist`,
    minify: false,
    target: target || 'node',
    plugins: [getDtsBunPlugin()],
    external: ['@node-rs/argon2', 'dockerode'],
  })

  if (!result.success) for (const log of result.logs) console.error(log)
}
