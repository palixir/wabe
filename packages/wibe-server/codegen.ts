import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
	overwrite: true,
	schema: './src/generated/schema.graphql',
	generates: {
		'./generated/wibe.ts': {
			plugins: [
				'typescript',
				'typescript-operations',
				'typescript-graphql-request',
			],
			documents: './src/**/*.graphql',
		},
	},
	ignoreNoDocuments: true,
}

export default config
