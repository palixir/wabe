import { runDatabase } from 'wibe-mongodb-launcher'

const setupEnvironment = () => {
	process.env.JWT_SECRET = 'dev'
}

await runDatabase()
setupEnvironment()
