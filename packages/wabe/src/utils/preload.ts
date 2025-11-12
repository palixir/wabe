import { runDatabase } from 'wabe-mongodb-launcher'

const setupEnvironment = () => {
	process.env.TEST = 'true'
}

await runDatabase()
setupEnvironment()
