import Docker from 'dockerode'
import tcpPortUsed from 'tcp-port-used'

const docker = new Docker()

// URL: 'postgres://postgres:postgres@localhost:5432/testdb'
export const runDatabase = async () => {
  try {
    const port = 5432

    if (await tcpPortUsed.check(port, '127.0.0.1')) {
      console.error(`Port ${port} is already in use.`)
      return
    }

    console.info('Pulling postgres:17.4')
    await docker.pull('postgres:17.4')

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

    console.error(error)
  }
}

runDatabase()
