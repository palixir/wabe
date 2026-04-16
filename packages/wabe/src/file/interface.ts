import type { WabeContext, WabeTypes } from 'src/server'

/**
 * Input shape accepted by Wabe when writing a File field via the
 * DatabaseController or GraphQL.
 *
 * Two forms are accepted (XOR):
 * - An object with an explicit `file` property to upload a new file.
 * - An object with an external `url` and its `name` for already-hosted files.
 */
export type WabeFileInput =
	| { file: File; url?: never; name?: never }
	| { file?: never; url: string; name: string }

/**
 * Stored and returned representation of a File field. This is what the
 * DatabaseController and GraphQL expose after the upload hooks have run.
 *
 * `urlGeneratedAt` can be returned as a `Date` (DatabaseController) or as a
 * string (serialized over GraphQL), so the type accepts both forms.
 */
export type WabeFile = {
	name: string
	url?: string
	urlGeneratedAt?: Date | string
	isPresignedUrl: boolean
}

export type FileUploadSecurityConfig = {
	/**
	 * Enable upload validation rules. Enabled by default in production.
	 */
	enabled?: boolean
	/**
	 * Maximum allowed file size in bytes.
	 */
	maxFileSizeBytes?: number
	/**
	 * Allowlist of MIME types accepted by uploads.
	 */
	allowedMimeTypes?: string[]
	/**
	 * Allowlist of file extensions accepted by uploads (without dot).
	 */
	allowedExtensions?: string[]
	/**
	 * Randomize uploaded file names (enabled by default in production).
	 */
	randomizeFileName?: boolean
}

/**
 * The file config contains the adapter to use to upload file
 * @param adapter: FileAdapter
 * @param urlCacheInSeconds: number Number of seconds to cache the url, equal to the number of seconds the url will be valid
 * @param devDirectory: string The directory where the files will be uploaded
 */
export type FileConfig<T extends WabeTypes> = {
	adapter: FileAdapter
	urlCacheInSeconds?: number
	devDirectory?: string
	beforeUpload?: (file: File, context: WabeContext<T>) => Promise<File> | File
	security?: FileUploadSecurityConfig
}

export interface ReadFileOptions {
	urlExpiresIn?: number
	port?: number
}

export interface FileAdapter {
	/**
	 * Upload a file and returns the url of the file
	 * @param file: File
	 */
	uploadFile(file: File): Promise<void>
	/**
	 * Read a file and returns the url of the file
	 * @param fileName: string
	 * @param urlExpiresIn: number Number of seconds to expire the url
	 * @returns The url of file or null if the file doesn't exist
	 */
	readFile(fileName: string, options?: ReadFileOptions): Promise<string | null> | string | null
	/*+
	 * Delete a file
	 * @param fileName: string
	 */
	deleteFile(fileName: string): Promise<void>
}
