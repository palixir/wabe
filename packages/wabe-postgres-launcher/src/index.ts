import Docker from 'dockerode'
import tcpPortUsed from 'tcp-port-used'

const docker = new Docker()

// URL: 'postgres://username:password@localhost:5432/databaseName'
export const runDatabase = async (): Promise<void> => {
  try {
    const port = 5432

    if (await tcpPortUsed.check(port, '127.0.0.1')) return

    console.info('Pulling postgres:17.4')
    const stream = await docker.pull('postgres:17.4')

    await new Promise((resolve, reject) => {
      docker.modem.followProgress(stream, (err, res) =>
        err ? reject(err) : resolve(res),
      )
    })

    console.info('Starting postgres:17.4')

    const container = await docker.createContainer({
      Image: 'postgres:17.4',
      name: 'Wabe-Postgres',
      Env: ['POSTGRES_USER=wabe', 'POSTGRES_PASSWORD=wabe', 'POSTGRES_DB=Wabe'],
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

    console.info('PostgreSQL started')
  } catch (error: any) {
    if (error.message.includes('there a typo in the url or port')) {
      console.error('You need to run Docker on your machine')
      return
    }

    // Try to find and remove the container if it exists
    try {
      const containers = await docker.listContainers({ all: true })
      const existingContainer = containers.find((container) =>
        container.Names.includes('/Wabe-Postgres'),
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

runDatabase()
