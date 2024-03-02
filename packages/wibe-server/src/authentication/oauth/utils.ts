// https://datatracker.ietf.org/doc/html/rfc7636#appendix-A
export const base64URLencode = (content: string) => {
	const hasher = new Bun.CryptoHasher('sha256')
	hasher.update(new TextEncoder().encode(content))
	const result = hasher.digest('base64')

	return result.split('=')[0].replace('+', '-').replace('/', '_')
}
