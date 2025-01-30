import { afterEach, describe, expect, it, spyOn } from 'bun:test'
import { WabeBuns3Adapter } from './index'
import { S3FileTest, S3Test } from './utils'

const spyS3ClientExist = spyOn(S3Test.prototype, 'exists')
const spyS3ClientWrite = spyOn(S3Test.prototype, 'write')
const spyS3ClientFile = spyOn(S3Test.prototype, 'file')
const spyS3ClientPresign = spyOn(S3FileTest.prototype, 'presign')
const spyS3ClientDelete = spyOn(S3Test.prototype, 'delete')

process.env.TEST = 'true'

describe('Wabe Buns3 adapter', () => {
  afterEach(() => {
    spyS3ClientExist.mockClear()
    spyS3ClientWrite.mockClear()
    spyS3ClientFile.mockClear()
    spyS3ClientDelete.mockClear()
    spyS3ClientPresign.mockClear()
  })

  it('should upload a file', async () => {
    const adapter = new WabeBuns3Adapter({
      accessKeyId: 'accessKeyId',
      secretAccessKey: 'secretAccessKey',
      bucket: 'test',
      endpoint: 'endpoint',
      acl: 'private',
    })

    await adapter.uploadFile(new File(['a'], 'a.text', { type: 'text/plain' }))

    expect(spyS3ClientWrite).toHaveBeenCalledTimes(1)
    expect(spyS3ClientWrite).toHaveBeenCalledWith(
      'a.text',
      new File(['a'], 'a.text', { type: 'text/plain' }),
    )
  })

  it('should read a file and return a presigned url', async () => {
    spyS3ClientExist.mockResolvedValue(true as never)

    const adapter = new WabeBuns3Adapter({
      accessKeyId: 'accessKeyId',
      secretAccessKey: 'secretAccessKey',
      bucket: 'test',
      endpoint: 'endpoint',
      acl: 'private',
    })

    spyS3ClientPresign.mockReturnValue('thisisanurl' as never)

    const url = await adapter.readFile('a.text')

    expect(spyS3ClientFile).toHaveBeenCalledTimes(1)
    expect(spyS3ClientFile).toHaveBeenCalledWith('a.text')
    expect(url).toEqual('thisisanurl')
  })

  it("should return null if a file doesn't exist", async () => {
    spyS3ClientExist.mockResolvedValue(false as never)

    const adapter = new WabeBuns3Adapter({
      accessKeyId: 'accessKeyId',
      secretAccessKey: 'secretAccessKey',
      bucket: 'test',
      endpoint: 'endpoint',
      acl: 'private',
    })

    spyS3ClientPresign.mockReturnValue('thisisanurl' as never)

    const url = await adapter.readFile('a.text')

    expect(spyS3ClientFile).toHaveBeenCalledTimes(0)
    expect(url).toBeNull()
  })

  it('should delete a file', async () => {
    const adapter = new WabeBuns3Adapter({
      accessKeyId: 'accessKeyId',
      secretAccessKey: 'secretAccessKey',
      bucket: 'test',
      endpoint: 'endpoint',
      acl: 'private',
    })

    await adapter.deleteFile('a.text')

    expect(spyS3ClientDelete).toHaveBeenCalledTimes(1)
    expect(spyS3ClientDelete).toHaveBeenCalledWith('a.text')
  })
})
