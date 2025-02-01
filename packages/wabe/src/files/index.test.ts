import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  spyOn,
} from 'bun:test'
import { FileDevAdapter, type Wabe } from '..'
import {
  type DevWabeTypes,
  closeTests,
  getAnonymousClient,
  setupTests,
} from '../utils/helper'
import { gql } from 'graphql-request'

describe('File upload', () => {
  let wabe: Wabe<DevWabeTypes>
  let port: number

  const spyFileDevAdapterUploadFile = spyOn(
    FileDevAdapter.prototype,
    'uploadFile',
  )
  const spyFileDevAdaapterReadFile = spyOn(FileDevAdapter.prototype, 'readFile')

  beforeAll(async () => {
    const setup = await setupTests([
      {
        name: 'Test3',
        fields: {
          file: { type: 'File' },
        },
        permissions: {
          read: {
            requireAuthentication: false,
          },
          create: {
            requireAuthentication: false,
          },
          update: {
            requireAuthentication: false,
          },
          delete: {
            requireAuthentication: false,
          },
        },
      },
    ])
    wabe = setup.wabe
    port = setup.port
  })

  afterAll(async () => {
    await closeTests(wabe)
  })

  afterEach(async () => {
    spyFileDevAdapterUploadFile.mockClear()
    spyFileDevAdaapterReadFile.mockClear()

    await wabe.controllers.database.deleteObjects({
      // @ts-expect-error
      className: 'Test3',
      context: {
        isRoot: true,
        wabe,
      },
      where: {},
      fields: [],
    })
  })

  it('should upload a file on request on type File on create request', async () => {
    const formData = new FormData()

    formData.append(
      'operations',
      JSON.stringify({
        query:
          'mutation ($file: File!) {createTest3(input: {fields: {file: {file:$file}}}){test3{id, file {name}}}}',
        variables: { file: null },
      }),
    )

    formData.append('map', JSON.stringify({ 0: ['variables.file'] }))

    formData.append('0', new File(['a'], 'a.text', { type: 'text/plain' }))

    const res = await fetch(`http://127.0.0.1:${port}/graphql`, {
      method: 'POST',
      body: formData,
    })

    const jsonRes = await res.json()

    // Return the url in dev adapter it's the file name
    expect(jsonRes.data.createTest3.test3.file.name).toEqual('a.text')

    expect(spyFileDevAdapterUploadFile).toHaveBeenCalledTimes(1)
    const fileArg = spyFileDevAdapterUploadFile.mock.calls[0][0]
    expect(fileArg.name).toEqual('a.text')
    expect(await fileArg.text()).toEqual('a')
  })

  it('should upload a file on request on type File on update request', async () => {
    const formData = new FormData()

    formData.append(
      'operations',
      JSON.stringify({
        query:
          'mutation ($file: File!) {createTest3(input: {fields: {file: {file:$file}}}){test3{id, file { name }}}}',
        variables: { file: null },
      }),
    )

    formData.append('map', JSON.stringify({ 0: ['variables.file'] }))

    formData.append('0', new File(['a'], 'a.text', { type: 'text/plain' }))

    const res = await fetch(`http://127.0.0.1:${port}/graphql`, {
      method: 'POST',
      body: formData,
    })

    const jsonRes = await res.json()

    const idOfCreatedObject = jsonRes.data.createTest3.test3.id

    const formData2 = new FormData()

    formData2.append(
      'operations',
      JSON.stringify({
        query: `mutation ($file: File!) {updateTest3(input: {id: "${idOfCreatedObject}",fields: {file: {file:$file}}}){test3{id, file { name }}}}`,
        variables: { file: null },
      }),
    )

    formData2.append('map', JSON.stringify({ 0: ['variables.file'] }))

    formData2.append('0', new File(['b'], 'b.text', { type: 'text/plain' }))

    const updatedRes = await fetch(`http://127.0.0.1:${port}/graphql`, {
      method: 'POST',
      body: formData2,
    })

    const jsonUpdatedRes = await updatedRes.json()

    // Return the url in dev adapter it's the file name
    expect(jsonUpdatedRes.data.updateTest3.test3.file.name).toEqual('b.text')

    // 2 for create and update
    expect(spyFileDevAdapterUploadFile).toHaveBeenCalledTimes(2)
    const fileArg = spyFileDevAdapterUploadFile.mock.calls[1][0]

    expect(fileArg.name).toEqual('b.text')
    expect(await fileArg.text()).toEqual('b')
  })

  it('should return the url of the file on after read request', async () => {
    const formData = new FormData()

    formData.append(
      'operations',
      JSON.stringify({
        query:
          'mutation ($file: File!) {createTest3(input: {fields: {file: {file:$file}}}){test3{id, file { name}}}}',
        variables: { file: null },
      }),
    )

    formData.append('map', JSON.stringify({ 0: ['variables.file'] }))

    formData.append('0', new File(['a'], 'a.text', { type: 'text/plain' }))

    await fetch(`http://127.0.0.1:${port}/graphql`, {
      method: 'POST',
      body: formData,
    })

    const anonymousClient = getAnonymousClient(port)

    const { test3s } = await anonymousClient.request<any>(
      gql`
        query {
          test3s {
            edges {
              node {
                id
                file {
                  name
                  url
                  urlGeneratedAt
                }
              }
            }
          }
        }
      `,
    )

    expect(test3s.edges[0].node.file.name).toEqual('a.text')
    expect(test3s.edges[0].node.file.url).toEqual('bucket/a.text')
    expect(new Date(test3s.edges[0].node.file.urlGeneratedAt)).toBeDate()
  })

  it('should delete the file on the bucket after delete the object', async () => {
    const formData = new FormData()

    formData.append(
      'operations',
      JSON.stringify({
        query:
          'mutation ($file: File!) {createTest3(input: {fields: {file: {file:$file}}}){test3{id, file { name}}}}',
        variables: { file: null },
      }),
    )

    formData.append('map', JSON.stringify({ 0: ['variables.file'] }))

    formData.append('0', new File(['a'], 'a.text', { type: 'text/plain' }))

    const res = await fetch(`http://127.0.0.1:${port}/graphql`, {
      method: 'POST',
      body: formData,
    })

    const jsonRes = await res.json()

    const id = jsonRes.data.createTest3.test3.id

    const url = await wabe.config.file?.adapter.readFile('a.text')
    expect(url).not.toBeNull()

    const anonymousClient = getAnonymousClient(port)

    await anonymousClient.request<any>(
      gql`
        mutation {
          deleteTest3(input: {id: "${id}"}) {
            test3 {
              id
            }
          }
        }
      `,
    )

    const { test3s } = await anonymousClient.request<any>(
      gql`
        query {
          test3s {
            edges {
              node {
                id
                file {
                  name
                  url
                  urlGeneratedAt
                }
              }
            }
          }
        }
      `,
    )

    expect(test3s.edges.length).toEqual(0)

    const url2 = await wabe.config.file?.adapter.readFile('a.text')
    expect(url2).toBeNull()
  })

  it('should upload a file providing an url without File scalar', async () => {
    const anonymousClient = getAnonymousClient(port)

    await anonymousClient.request<any>(
      gql`
        mutation {
          createTest3(input: {fields: {file: {url: "https://wabe.dev/assets/logo.png"}}}) {
            test3 {
              id
              file {
                name
                url
                urlGeneratedAt
              }
            }
          }
        }
      `,
    )

    const { test3s } = await anonymousClient.request<any>(
      gql`
        query {
          test3s {
            edges {
              node {
                id
                file {
                  name
                  url
                  urlGeneratedAt
                }
              }
            }
          }
        }
      `,
    )

    expect(test3s.edges[0].node.file.url).toEqual(
      'https://wabe.dev/assets/logo.png',
    )
  })
})
