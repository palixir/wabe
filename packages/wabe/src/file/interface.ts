import type { WabeContext, WabeTypes } from 'src/server'

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
	readFile(
		fileName: string,
		options?: ReadFileOptions,
	): Promise<string | null> | string | null
	/*+
	 * Delete a file
	 * @param fileName: string
	 */
	deleteFile(fileName: string): Promise<void>
}
