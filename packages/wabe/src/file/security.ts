import crypto from 'node:crypto'
import path from 'node:path'
import type { WabeContext, WabeTypes } from 'src/server'
import type { FileUploadSecurityConfig } from './interface'

const DEFAULT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

const DEFAULT_ALLOWED_MIME_TYPES = [
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
	'application/pdf',
	'text/plain',
	'application/json',
	'text/csv',
]

const DEFAULT_ALLOWED_EXTENSIONS = [
	'jpg',
	'jpeg',
	'png',
	'gif',
	'webp',
	'pdf',
	'txt',
	'json',
	'csv',
]

const MIME_SIGNATURES: Array<{
	mimeType: string
	bytes: number[]
	offset?: number
}> = [
	{
		mimeType: 'image/png',
		bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
	},
	{ mimeType: 'image/jpeg', bytes: [0xff, 0xd8, 0xff] },
	{ mimeType: 'image/gif', bytes: [0x47, 0x49, 0x46, 0x38] },
	{ mimeType: 'image/webp', bytes: [0x52, 0x49, 0x46, 0x46] },
	{ mimeType: 'application/pdf', bytes: [0x25, 0x50, 0x44, 0x46, 0x2d] },
]

const MIME_TO_EXTENSIONS: Record<string, string[]> = {
	'image/jpeg': ['jpg', 'jpeg'],
	'image/png': ['png'],
	'image/gif': ['gif'],
	'image/webp': ['webp'],
	'application/pdf': ['pdf'],
	'text/plain': ['txt'],
	'application/json': ['json'],
	'text/csv': ['csv'],
}

const normalizeMimeType = (mimeType: string) =>
	mimeType.trim().toLowerCase().split(';')[0]?.trim() || ''

const normalizeExtension = (fileName: string) =>
	path.extname(fileName).replace('.', '').trim().toLowerCase()

const hasSignature = (fileHeader: Uint8Array, bytes: number[], offset = 0) =>
	bytes.every((value, index) => fileHeader[offset + index] === value)

const detectMimeTypeFromContent = async (file: File) => {
	const header = new Uint8Array(await file.slice(0, 16).arrayBuffer())

	for (const signature of MIME_SIGNATURES) {
		if (hasSignature(header, signature.bytes, signature.offset)) {
			if (
				signature.mimeType === 'image/webp' &&
				!(header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50)
			) {
				continue
			}

			return signature.mimeType
		}
	}

	return null
}

const getUploadSecurityConfig = <T extends WabeTypes>(context: WabeContext<T>) => {
	const security = context.wabe.config.file?.security
	const enabled = security?.enabled ?? context.wabe.config.isProduction
	const maxFileSizeBytes = security?.maxFileSizeBytes ?? DEFAULT_MAX_FILE_SIZE_BYTES
	const allowedMimeTypes = (security?.allowedMimeTypes || DEFAULT_ALLOWED_MIME_TYPES).map(
		normalizeMimeType,
	)
	const allowedExtensions = (security?.allowedExtensions || DEFAULT_ALLOWED_EXTENSIONS).map(
		(value) => value.trim().toLowerCase(),
	)
	const randomizeFileName = security?.randomizeFileName ?? context.wabe.config.isProduction

	return {
		enabled,
		maxFileSizeBytes,
		allowedMimeTypes,
		allowedExtensions,
		randomizeFileName,
	}
}

const createRandomizedFile = async (file: File, extension: string) => {
	const uniqueName = `${crypto.randomUUID()}.${extension}`
	const content = await file.arrayBuffer()

	return new File([content], uniqueName, {
		type: file.type,
		lastModified: Date.now(),
	})
}

export const secureUploadedFile = async <T extends WabeTypes>(
	file: File,
	context: WabeContext<T>,
): Promise<File> => {
	const { enabled, maxFileSizeBytes, allowedMimeTypes, allowedExtensions, randomizeFileName } =
		getUploadSecurityConfig(context)

	if (!enabled) return file

	if (file.size > maxFileSizeBytes) throw new Error('File exceeds maximum allowed size')

	const extension = normalizeExtension(file.name)
	if (!extension || !allowedExtensions.includes(extension))
		throw new Error('File extension is not allowed')

	const mimeType = normalizeMimeType(file.type || '')
	if (!mimeType || !allowedMimeTypes.includes(mimeType))
		throw new Error('File MIME type is not allowed')

	const detectedMimeType = await detectMimeTypeFromContent(file)

	if (detectedMimeType && detectedMimeType !== mimeType)
		throw new Error('File content does not match MIME type')

	if (detectedMimeType && !allowedMimeTypes.includes(detectedMimeType))
		throw new Error('File content type is not allowed')

	const allowedExtensionsForMime = MIME_TO_EXTENSIONS[mimeType]
	if (allowedExtensionsForMime && !allowedExtensionsForMime.includes(extension))
		throw new Error('File extension does not match MIME type')

	if (!randomizeFileName) return file

	return createRandomizedFile(file, extension)
}

export const getUploadSecurityConfigForTests = <T extends WabeTypes>(
	context: WabeContext<T>,
): ReturnType<typeof getUploadSecurityConfig> => getUploadSecurityConfig(context)

export type { FileUploadSecurityConfig }
