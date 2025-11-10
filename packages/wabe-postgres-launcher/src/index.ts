import Docker from 'dockerode'
import tcpPortUsed from 'tcp-port-used'
import PQueue from 'p-queue'

const queue = new PQueue({ concurrency: 1 })

export const runDatabase = async (): Promise<void> =>
	queue.add(async () => {
		await startPostgres()
	})

const docker = new Docker()

// URL: 'postgres://username:password@localhost:5432/databaseName'
export const startPostgres = async (): Promise<void> => {
	try {
		const port = 5432

		if (await tcpPortUsed.check(port, '127.0.0.1')) return

		const imageName = 'postgres:17.4-alpine'

		// Check if the image already exists locally
		const images = await docker.listImages()

		if (!images.find((image) => image.RepoTags?.includes(imageName))) {
			console.info(`Pulling ${imageName}`)

			const stream = await docker.pull(imageName)

			await new Promise((resolve, reject) => {
				docker.modem.followProgress(stream, (err, res) => {
					console.log(err, res)
					return err ? reject(err) : resolve(res)
				})
			})
		}

		const container = await docker.createContainer({
			Image: imageName,
			name: 'wabe-postgres',
			Env: [
				'POSTGRES_USER=wabe',
				'POSTGRES_PASSWORD=wabe',
				'POSTGRES_DB=Wabe',
			],
			HostConfig: {
				PortBindings: {
					'5432/tcp': [{ HostPort: `${port}` }],
				},
			},
			AttachStdin: false,
			AttachStdout: true,
			AttachStderr: true,
			Tty: true,
			OpenStdin: false,
			StdinOnce: false,
		})

		await container.start()

		while (!(await tcpPortUsed.check(port, '127.0.0.1'))) {
			await Bun.sleep(1000)
		}

		// 2000 ms more to let the time to established connection
		await Bun.sleep(2000)

		console.info('PostgreSQL started')
	} catch (error: any) {
		if (error.message.includes('there a typo in the url or port')) {
			console.error('You need to run Docker on your machine')
			process.exit(1)
		}

		// Try to find and remove the container if it exists
		try {
			const containers = await docker.listContainers({ all: true })
			const existingContainer = containers.find((container) =>
				container.Names.includes('/wabe-postgres')
			)

			if (existingContainer) {
				const container = docker.getContainer(existingContainer.Id)
				await container.stop()
				await container.remove()

				// We retry to run the database
				return runDatabase()
			}
		} catch (cleanupError) {
			console.error('Error during cleanup:', cleanupError)
		}

		console.error('An error occurred:', error)
	}
}
