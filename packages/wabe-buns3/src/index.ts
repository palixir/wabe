import type { S3Client, S3Options } from 'bun'
import type { FileAdapter, ReadFileOptions } from 'wabe'
import { getS3Client } from './utils'

export type Acl =
  | 'private'
  | 'public-read'
  | 'public-read-write'
  | 'aws-exec-read'
  | 'authenticated-read'
  | 'bucket-owner-read'
  | 'bucket-owner-full-control'
  | 'log-delivery-write'

export class Buns3Adapter implements FileAdapter {
  public s3Client: S3Client
  private aclForUrl: Acl

  constructor(options: S3Options & { aclForUrl?: Acl }) {
    this.s3Client = getS3Client(options)

    this.aclForUrl = options.aclForUrl || 'private'
  }

  async uploadFile(file: File | Blob): Promise<void> {
    await this.s3Client.write(file.name, file)
  }

  async readFile(fileName: string, options?: ReadFileOptions) {
    if (!(await this.s3Client.exists(fileName))) return null

    const s3file = this.s3Client.file(fileName)

    return s3file.presign({
      expiresIn: options?.urlExpiresIn || 3600 * 24,
      acl: this.aclForUrl,
    })
  }

  async deleteFile(fileName: string): Promise<void> {
    await this.s3Client.delete(fileName)
  }
}
