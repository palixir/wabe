import { generateCodegen } from '../src/server/generateCodegen'

await generateCodegen({
	path: `${import.meta.dirname}/../generated/`,
	schema: {
		classes: [],
	},
})
