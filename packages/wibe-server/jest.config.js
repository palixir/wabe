/* eslint-disable */
module.exports = {
	testMatch: ['**/*.test.ts'],
	testTimeout: 60000,
	workerIdleMemoryLimit: '500MB',
	coveragePathIgnorePatterns: ['/node_modules/'],
	transform: {
		'^.+\\.tsx?$': ['ts-jest', { isolatedModules: true }],
	},
	testEnvironment: 'node',
}
