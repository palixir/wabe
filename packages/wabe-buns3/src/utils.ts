import { S3Client, type S3Options } from 'bun'

export class S3FileTest {
	presign() {}
}

export class S3Test {
	write() {}

	file() {
		return new S3FileTest()
	}

	exists() {}

	delete() {}
}

export const getS3Client = (options: S3Options): S3Client =>
	// @ts-expect-error
	process.env.TEST ? new S3Test() : new S3Client(options)
