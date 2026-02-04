import { $ } from 'bun'
import tcpPortUsed from 'tcp-port-used'
import { readdir } from 'node:fs/promises'

const packages = await readdir('./packages', { withFileTypes: true })

const excludedPackages = ['wabe-build', 'wabe-documentation']
const otherPackagesToRunAfterMainPackages = ['wabe-mongodb', 'wabe-postgres']

const packagesWithoutDatabaseAdapters = packages.filter(
	(packageDirectory) =>
		![...excludedPackages, ...otherPackagesToRunAfterMainPackages].includes(packageDirectory.name),
)

const firstCommand = packagesWithoutDatabaseAdapters
	.map(({ name }) => `bun --filter ./packages/${name} ci`)
	.join(' && ')

// Include wabe-mongodb and wabe-postgres
const secondCommand = otherPackagesToRunAfterMainPackages
	.map((name) => `bun --filter ./packages/${name} ci`)
	.join(' && ')

await $`sh -c ${firstCommand}`

console.log('⏳ Waiting for port 27045 (for mongodb) to be free...')
await tcpPortUsed.waitUntilFree(27045, 100, 30000)
console.log('✅ Port 27045 is free.')

await $`sh -c ${secondCommand}`
