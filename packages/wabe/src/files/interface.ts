/**
 * The file config contains the adapter to use to upload file
 */
export interface FileConfig {
  adapter: FileAdapter
}

export interface FileAdapter {
  /**
   * Upload a file and returns the url of the file
   * @param file: File
   */
  uploadFile(file: File | Blob): Promise<void>
  /**
   * Read a file and returns the url of the file
   * @param fileName: string
   * @returns The url of file or null if the file doesn't exist
   */
  readFile(fileName: string): Promise<string | null> | string | null
  /*+
   * Delete a file
   * @param fileName: string
   */
  deleteFile(fileName: string): Promise<void>
}
