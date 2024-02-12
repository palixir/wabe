import type { CodegenConfig } from '@graphql-codegen/cli'

const config: CodegenConfig = {
	overwrite: true,
	schema: './generated/schema.graphql',
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
}

export default config
