import { $ } from 'bun'
import { readdir } from 'node:fs/promises'

const packages = await readdir('./packages', { withFileTypes: true })

const excludedPackages = ['wabe-build', 'wabe-documentation']
const otherPackagesToRunBeforeMainPackages = [
	'wabe-mongodb-launcher',
	'wabe-postgres-launcher',
	'wabe',
]

const packagesWithoutDatabaseLaunchersAndExcludedPackages = packages.filter(
	(packageDirectory) =>
		![...excludedPackages, ...otherPackagesToRunBeforeMainPackages].includes(
			packageDirectory.name,
		),
)

const firstCommand = otherPackagesToRunBeforeMainPackages
	.map((name) => `bun --filter ./packages/${name} build`)
	.join(' && ')

const secondCommand = packagesWithoutDatabaseLaunchersAndExcludedPackages
	.map(({ name }) => `bun --filter ./packages/${name} build`)
	.join(' && ')

await $`sh -c ${firstCommand}`
await $`sh -c ${secondCommand}`
