import { runDatabase as runPostgresDatabase } from 'wabe-postgres-launcher'

const setupEnvironment = () => {
  process.env.TEST = 'true'
}

await runPostgresDatabase()
setupEnvironment()
