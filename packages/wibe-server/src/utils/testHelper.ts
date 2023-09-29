import { runDatabase } from 'wibe-mongodb-launcher'

export const testSetup = async () => {
	return runDatabase()
}
