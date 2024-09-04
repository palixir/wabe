/**
 * A file adpater that upload a file and returns the url of the file
 * @param file: File
 * @returns The url of the uploaded file
 */
export type WabeFileAdapter = (file: File) => Promise<string>

/**
 * The file config contains the adapter to use to upload file
 */
export interface FileConfig {
  adapter: WabeFileAdapter
}
