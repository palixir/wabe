import { generate, type CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
	schema: './generated/schema.graphql',
	generates: {
		'./generated/schema.ts': {
			plugins: ['typescript', 'typescript-resolvers'],
			watchPattern: '**/*.ts',
		},
		'./generated/schema.graphql': {
			plugins: ['schema-ast'],
			config: {
				commentDescriptions: true,
			},
			watchPattern: '**/*.graphql',
		},
	},
	watch: true,
}

export default config
