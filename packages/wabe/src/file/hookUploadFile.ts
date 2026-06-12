import type { HookObject } from '../hooks/HookObject'
import { secureUploadedFile } from './security'

const ALLOWED_URL_PROTOCOLS = ['https:']

const stripIpv6Brackets = (hostname: string) =>
	hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname

/**
 * Blocks hostnames that resolve (textually) to loopback, private, link-local or cloud-metadata
 * addresses to mitigate SSRF (e.g. exfiltrating `http://169.254.169.254/...` credentials).
 * Note: this only inspects literal host values; a full defense also pins DNS resolution at fetch time.
 */
const isPrivateOrReservedHost = (rawHostname: string): boolean => {
	const hostname = stripIpv6Brackets(rawHostname).toLowerCase()

	if (hostname === 'localhost' || hostname.endsWith('.localhost')) return true

	// IPv4 (and IPv4-mapped IPv6) literals.
	const ipv4Match = hostname.match(/(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
	if (ipv4Match) {
		const octets = ipv4Match.slice(1, 5).map((value) => Number(value))
		if (octets.some((octet) => octet > 255)) return true

		const [a, b] = octets as [number, number, number, number]

		if (a === 0 || a === 10 || a === 127) return true // "this", private, loopback
		if (a === 169 && b === 254) return true // link-local + cloud metadata (169.254.169.254)
		if (a === 172 && b >= 16 && b <= 31) return true // private
		if (a === 192 && b === 168) return true // private
		if (a >= 224) return true // multicast / reserved
		return false
	}

	// IPv6 loopback / unspecified / unique-local (fc00::/7) / link-local (fe80::/10).
	if (hostname === '::1' || hostname === '::') return true
	if (hostname.startsWith('fc') || hostname.startsWith('fd')) return true
	if (
		hostname.startsWith('fe8') ||
		hostname.startsWith('fe9') ||
		hostname.startsWith('fea') ||
		hostname.startsWith('feb')
	)
		return true

	return false
}

export const validateFileUrl = (url: string): void => {
	let parsed: URL
	try {
		parsed = new URL(url)
	} catch {
		throw new Error('Invalid file URL')
	}

	if (!ALLOWED_URL_PROTOCOLS.includes(parsed.protocol)) throw new Error('File URL must use HTTPS')

	if (isPrivateOrReservedHost(parsed.hostname))
		throw new Error('File URL must not point to a private or reserved address')
}

const isFileInputCandidate = (
	value: unknown,
): value is Partial<{ file: unknown; url: unknown; name: unknown }> =>
	typeof value === 'object' && value !== null && !(value instanceof File)

const handleFile = async (hookObject: HookObject<any, any>) => {
	const newData = hookObject.getNewData()

	const schema = hookObject.context.wabe.config.schema?.classes?.find(
		(currentClass) => currentClass.name === hookObject.className,
	)

	if (!schema) return

	const beforeUpload = hookObject.context.wabe.config.file?.beforeUpload

	await Promise.all(
		Object.keys(newData).map(async (keyName) => {
			if (schema.fields[keyName]?.type !== 'File') return

			const candidate = newData[keyName]

			if (candidate instanceof File)
				throw new Error(
					`File field "${keyName}" must be provided as { file } or { url, name }, not a bare File instance`,
				)

			if (!isFileInputCandidate(candidate)) return

			const file = candidate.file instanceof File ? candidate.file : undefined
			const url = typeof candidate.url === 'string' ? candidate.url : undefined
			const name = typeof candidate.name === 'string' ? candidate.name : undefined

			if (!file && !url) return

			if (file && url)
				throw new Error(
					`File field "${keyName}" cannot have both "file" and "url" set at the same time`,
				)

			if (url) {
				validateFileUrl(url)

				const nextValue: { name?: string; url: string; isPresignedUrl: boolean } = {
					url,
					isPresignedUrl: false,
					...(name ? { name } : {}),
				}

				hookObject.upsertNewData(keyName, nextValue)
				return
			}

			if (!file) return

			if (!hookObject.context.wabe.controllers.file) throw new Error('No file adapter found')

			const fileFromBeforeUpload = (await beforeUpload?.(file, hookObject.context)) || file
			const fileToUpload = await secureUploadedFile(fileFromBeforeUpload, hookObject.context)

			// We upload the file and set the name of the file in the newData
			await hookObject.context.wabe.controllers.file?.uploadFile(fileToUpload)

			hookObject.upsertNewData(keyName, {
				name: fileToUpload.name,
				isPresignedUrl: true,
			})
		}),
	)
}

export const defaultBeforeCreateUpload = (hookObject: HookObject<any, any>) =>
	handleFile(hookObject)

export const defaultBeforeUpdateUpload = (hookObject: HookObject<any, any>) =>
	handleFile(hookObject)
