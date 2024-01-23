const run = async () => {
	const res = await fetch('http://localhost:3000/graphql')
	console.log(res)
}

run().catch((err) => {
	console.error(err)
})
