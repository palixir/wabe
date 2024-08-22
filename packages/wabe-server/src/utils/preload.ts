import { runDatabase } from 'wibe-mongodb-launcher'

const setupEnvironment = () => {
	process.env.JWT_SECRET = 'dev'
	process.env.TEST = 'true'
}

await runDatabase()
setupEnvironment()
