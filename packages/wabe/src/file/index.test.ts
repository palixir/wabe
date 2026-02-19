import { afterAll, afterEach, beforeAll, describe, expect, it, mock, spyOn } from 'bun:test'
import { FileDevAdapter, type Wabe } from '..'
import { type DevWabeTypes, getAnonymousClient } from '../utils/helper'
import { setupTests, closeTests } from '../utils/testHelper'
import { gql } from 'graphql-request'

describe('File upload', () => {
	let wabe: Wabe<DevWabeTypes>
	let port: number

	const spyFileDevAdapterUploadFile = spyOn(FileDevAdapter.prototype, 'uploadFile')
	const spyFileDevAdapterReadFile = spyOn(FileDevAdapter.prototype, 'readFile')

	const mockBeforeUpload = mock()

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

		spyFileDevAdapterReadFile.mockClear()
		spyFileDevAdapterUploadFile.mockClear()

		const fileConfig = wabe.config.file

		if (fileConfig) fileConfig.beforeUpload = mockBeforeUpload
	})

	afterAll(async () => {
		await closeTests(wabe)
	})

	afterEach(async () => {
		spyFileDevAdapterUploadFile.mockClear()
		spyFileDevAdapterReadFile.mockClear()
		mockBeforeUpload.mockClear()

		await wabe.controllers.database.deleteObjects({
			// @ts-expect-error
			className: 'Test3',
			context: {
				isRoot: true,
				wabe,
			},
			where: {},
			select: {},
		})
	})

	it('should call beforeUpload if specified in the file config', async () => {
		await wabe.controllers.database.createObject({
			// @ts-expect-error
			className: 'Test3',
			context: {
				isRoot: true,
				wabe,
			},
			data: {
				// @ts-expect-error
				file: {
					file: new File(['a'], 'a', { type: 'text/plain' }),
				},
			},
			select: {},
		})

		expect(mockBeforeUpload).toHaveBeenCalledTimes(1)
		const fileArg = mockBeforeUpload.mock.calls[0]?.[0]
		expect(fileArg?.name).toEqual('a')
		expect(await fileArg?.text()).toEqual('a')

		// should return the same file if no file is returned by beforeUpload
		expect(spyFileDevAdapterUploadFile).toHaveBeenCalledTimes(1)
		const fileArg2 = spyFileDevAdapterUploadFile.mock.calls[0]?.[0]
		expect(fileArg2?.name).toEqual('a')
		expect(await fileArg2?.text()).toEqual('a')
	})

	it('should call beforeUpload and return the file returned by beforeUpload', async () => {
		mockBeforeUpload.mockImplementationOnce(() => new File(['b'], 'b.txt', { type: 'text/plain' }))

		await wabe.controllers.database.createObject({
			// @ts-expect-error
			className: 'Test3',
			context: {
				isRoot: true,
				wabe,
			},
			data: {
				// @ts-expect-error
				file: {
					file: new File(['a'], 'a', { type: 'text/plain' }),
				},
			},
			select: {},
		})

		expect(mockBeforeUpload).toHaveBeenCalledTimes(1)
		const fileArg = mockBeforeUpload.mock.calls[0]?.[0]
		expect(fileArg?.name).toEqual('a')
		expect(await fileArg?.text()).toEqual('a')

		// should return the same file if no file is returned by beforeUpload
		expect(spyFileDevAdapterUploadFile).toHaveBeenCalledTimes(1)
		const fileArg2 = spyFileDevAdapterUploadFile.mock.calls[0]?.[0]
		expect(fileArg2?.name).toEqual('b.txt')
		expect(await fileArg2?.text()).toEqual('b')
	})

	it('should not crash when there is no extension for the uploaded file', async () => {
		await wabe.controllers.database.createObject({
			// @ts-expect-error
			className: 'Test3',
			context: {
				isRoot: true,
				wabe,
			},
			data: {
				// @ts-expect-error
				file: {
					file: new File(['a'], 'a', { type: 'text/plain' }),
				},
			},
			select: {},
		})

		const result = await wabe.controllers.database.getObjects({
			// @ts-expect-error
			className: 'Test3',
			context: {
				isRoot: true,
				wabe,
			},
			where: {},
			// @ts-expect-error
			select: { file: true, id: true },
		})

		// @ts-expect-error
		expect(result[0].file.name).toEqual('a')
		// @ts-expect-error
		expect(result[0].file.url).toEqual(`http://127.0.0.1:${port}/bucket/a`)
	})

	it('should throw an error if no file adapter is provided', async () => {
		const previousFileController = wabe.controllers.file
		// @ts-expect-error
		wabe.controllers.file = null

		const formData = new FormData()

		formData.append(
			'operations',
			JSON.stringify({
				query:
					'mutation ($file: File!) {createTest3(input: {fields: {file: {file:$file}}}){test3{id, file {name, isPresignedUrl}}}}',
				variables: { file: null },
			}),
		)

		formData.append('map', JSON.stringify({ 0: ['variables.file'] }))

		formData.append('0', new File(['a'], 'a.text', { type: 'text/plain' }))

		const res = await fetch(`http://127.0.0.1:${port}/graphql`, {
			method: 'POST',
			body: formData,
		})

		expect(await res.text()).toContain('No file adapter found')

		wabe.controllers.file = previousFileController
	})

	it("should upload a file with the database controller's method", async () => {
		await wabe.controllers.database.createObject({
			// @ts-expect-error
			className: 'Test3',
			context: {
				isRoot: true,
				wabe,
			},
			data: {
				// @ts-expect-error
				file: {
					file: new File(['a'], 'a.text', { type: 'text/plain' }),
				},
			},
			select: {},
		})

		const result = await wabe.controllers.database.getObjects({
			// @ts-expect-error
			className: 'Test3',
			context: {
				isRoot: true,
				wabe,
			},
			where: {},
			// @ts-expect-error
			select: { file: true, id: true },
		})

		// @ts-expect-error
		expect(result[0].file.name).toEqual('a.text')
		// @ts-expect-error
		expect(result[0].file.url).toEqual(`http://127.0.0.1:${port}/bucket/a.text`)

		const res = await wabe.controllers.database.updateObject({
			// @ts-expect-error
			className: 'Test3',
			context: {
				isRoot: true,
				wabe,
			},
			where: {},
			// @ts-expect-error
			select: { file: true, id: true },
			data: {
				// @ts-expect-error
				file: {
					url: 'https://palixir.github.io/wabe//assets/logo.png',
				},
			},
			id: result?.[0]?.id || '',
		})

		// @ts-expect-error
		expect(res.file.url).toEqual('https://palixir.github.io/wabe//assets/logo.png')
		// @ts-expect-error
		expect(res.file.isPresignedUrl).toEqual(false)
	})

	it('should upload multiple objects with the same file', async () => {
		const formData = new FormData()

		formData.append(
			'operations',
			JSON.stringify({
				query: gql`
					mutation ($file: File!, $file2: File!) {
						createTest3s(input: { fields: [{ file: { file: $file } }, { file: { file: $file2 } }] }) {
							edges {
								node {
									id
									file {
										name
									}
								}
							}
						}
					}
				`,
				variables: { file: null },
			}),
		)

		formData.append('map', JSON.stringify({ 0: ['variables.file'], 1: ['variables.file2'] }))
		formData.append('0', new File(['a'], 'a.text', { type: 'text/plain' }))
		formData.append('1', new File(['b'], 'b.text', { type: 'text/plain' }))

		const res = await fetch(`http://127.0.0.1:${port}/graphql`, {
			method: 'POST',
			body: formData,
		})

		const jsonRes = await res.json()

		// Return the url in dev adapter it's the file name
		expect(jsonRes.data.createTest3s.edges[0].node.file.name).toEqual('a.text')
		expect(jsonRes.data.createTest3s.edges[1].node.file.name).toEqual('b.text')

		expect(spyFileDevAdapterUploadFile).toHaveBeenCalledTimes(2)
		const fileArg = spyFileDevAdapterUploadFile.mock.calls[0]?.[0]
		expect(fileArg?.name).toEqual('a.text')
		expect(await fileArg?.text()).toEqual('a')

		const fileArg2 = spyFileDevAdapterUploadFile.mock.calls[1]?.[0]
		expect(fileArg2?.name).toEqual('b.text')
		expect(await fileArg2?.text()).toEqual('b')
	})

	it('should upload a file on request on type File on create request', async () => {
		const formData = new FormData()

		formData.append(
			'operations',
			JSON.stringify({
				query:
					'mutation ($file: File!) {createTest3(input: {fields: {file: {file:$file}}}){test3{id, file {name, isPresignedUrl}}}}',
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
		expect(jsonRes.data.createTest3.test3.file.isPresignedUrl).toEqual(true)

		expect(spyFileDevAdapterUploadFile).toHaveBeenCalledTimes(1)
		const fileArg = spyFileDevAdapterUploadFile.mock.calls[0]?.[0]
		expect(fileArg?.name).toEqual('a.text')
		expect(await fileArg?.text()).toEqual('a')
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
		const fileArg = spyFileDevAdapterUploadFile.mock.calls[1]?.[0]
		expect(fileArg?.name).toEqual('b.text')
		expect(await fileArg?.text()).toEqual('b')
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

		const { test3s } = await anonymousClient.request<any>(gql`
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
		`)

		expect(test3s.edges[0].node.file.name).toEqual('a.text')
		expect(test3s.edges[0].node.file.url).toEqual(`http://127.0.0.1:${port}/bucket/a.text`)
		expect(new Date(test3s.edges[0].node.file.urlGeneratedAt)).toBeDate()
	})

	it('should return the url of the file on after read request for multiple objects', async () => {
		const upload = async (fileName: string, content: string) => {
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

			formData.append('0', new File([content], fileName, { type: 'text/plain' }))

			await fetch(`http://127.0.0.1:${port}/graphql`, {
				method: 'POST',
				body: formData,
			})
		}

		await upload('a.text', 'a')
		await upload('b.text', 'b')

		const anonymousClient = getAnonymousClient(port)

		const { test3s } = await anonymousClient.request<any>(gql`
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
		`)

		const files = test3s.edges.map((edge: any) => edge.node.file)

		expect(files).toHaveLength(2)
		expect(files.map((f: any) => f.name)).toEqual(expect.arrayContaining(['a.text', 'b.text']))

		files.forEach((file: any) => {
			expect(file.url).toEqual(`http://127.0.0.1:${port}/bucket/${file.name}`)
			expect(new Date(file.urlGeneratedAt)).toBeDate()
		})
	})

	it('should not read the file again in the bucket if the cache is not expired', async () => {
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

		const { test3s } = await anonymousClient.request<any>(gql`
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
		`)

		expect(test3s.edges[0].node.file.name).toEqual('a.text')
		expect(test3s.edges[0].node.file.url).toEqual(`http://127.0.0.1:${port}/bucket/a.text`)
		expect(new Date(test3s.edges[0].node.file.urlGeneratedAt)).toBeDate()

		expect(spyFileDevAdapterReadFile).toHaveBeenCalledTimes(1)

		await anonymousClient.request<any>(gql`
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
		`)

		// Again once because the cache is not expired
		expect(spyFileDevAdapterReadFile).toHaveBeenCalledTimes(1)
	})

	it('should reset the cache if the file is updated', async () => {
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

		const { test3s } = await anonymousClient.request<any>(gql`
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
		`)

		expect(test3s.edges[0].node.file.name).toEqual('a.text')
		expect(test3s.edges[0].node.file.url).toEqual(`http://127.0.0.1:${port}/bucket/a.text`)
		expect(new Date(test3s.edges[0].node.file.urlGeneratedAt)).toBeDate()

		expect(spyFileDevAdapterReadFile).toHaveBeenCalledTimes(1)

		const idOfCreatedObject = test3s.edges[0].node.id

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

		// We update the file
		await fetch(`http://127.0.0.1:${port}/graphql`, {
			method: 'POST',
			body: formData2,
		})

		await anonymousClient.request<any>(gql`
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
		`)

		// Again once because the file was updated
		expect(spyFileDevAdapterReadFile).toHaveBeenCalledTimes(2)
	})

	it('should reset the cache if the url is updated', async () => {
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

		const { test3s } = await anonymousClient.request<any>(gql`
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
		`)

		expect(test3s.edges[0].node.file.name).toEqual('a.text')
		expect(test3s.edges[0].node.file.url).toEqual(`http://127.0.0.1:${port}/bucket/a.text`)
		expect(new Date(test3s.edges[0].node.file.urlGeneratedAt)).toBeDate()

		expect(spyFileDevAdapterReadFile).toHaveBeenCalledTimes(1)

		const idOfCreatedObject = test3s.edges[0].node.id

		await wabe.controllers.database.updateObject({
			// @ts-expect-error
			className: 'Test3',
			context: {
				isRoot: true,
				wabe,
			},
			where: {},
			// @ts-expect-error
			select: { file: true, id: true },
			data: {
				// @ts-expect-error
				file: {
					url: 'https://palixir.github.io/wabe//assets/logo.png',
				},
			},
			id: idOfCreatedObject,
		})

		await anonymousClient.request<any>(gql`
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
		`)

		expect(spyFileDevAdapterReadFile).toHaveBeenCalledTimes(1)
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

		const { test3s } = await anonymousClient.request<any>(gql`
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
		`)

		expect(test3s.edges.length).toEqual(0)

		const url2 = await wabe.config.file?.adapter.readFile('a.text')
		expect(url2).toBeNull()
	})

	it('should not delete a file if the file not exists', async () => {
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

		await wabe.config.file?.adapter.deleteFile('a.text')

		const anonymousClient = getAnonymousClient(port)

		expect(
			anonymousClient.request<any>(
				gql`
        mutation {
          deleteTest3(input: {id: "${id}"}) {
            test3 {
              id
            }
          }
        }
      `,
			),
		).resolves.toEqual(expect.anything())
	})

	it('should upload a file providing an url without File scalar', async () => {
		const anonymousClient = getAnonymousClient(port)

		await anonymousClient.request<any>(gql`
			mutation {
				createTest3(
					input: { fields: { file: { url: "https://palixir.github.io/wabe//assets/logo.png" } } }
				) {
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
		`)

		const { test3s } = await anonymousClient.request<any>(gql`
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
		`)

		expect(test3s.edges[0].node.file.url).toEqual('https://palixir.github.io/wabe//assets/logo.png')
	})

	it('should upload a file and access to it with the local url provided by upload directory', async () => {
		await wabe.controllers.database.createObject({
			// @ts-expect-error
			className: 'Test3',
			context: {
				isRoot: true,
				wabe,
			},
			data: {
				// @ts-expect-error
				file: {
					file: new File(['this is the content'], 'a.txt', {
						type: 'text/plain',
					}),
				},
			},
			select: {},
		})

		const result = await wabe.controllers.database.getObjects({
			// @ts-expect-error
			className: 'Test3',
			context: {
				isRoot: true,
				wabe,
			},
			where: {},
			// @ts-expect-error
			select: { file: true, id: true },
		})

		// @ts-expect-error
		expect(result[0].file.name).toEqual('a.txt')
		// @ts-expect-error
		expect(result[0].file.url).toEqual(`http://127.0.0.1:${port}/bucket/a.txt`)

		// @ts-expect-error
		const url = result?.[0]?.file?.url

		const res = await fetch(url)

		expect(await res.text()).toEqual('this is the content')
	})
})

describe('File upload security in production', () => {
	let wabe: Wabe<DevWabeTypes>

	beforeAll(async () => {
		const setup = await setupTests(
			[
				{
					name: 'TestSecurityFile',
					fields: {
						file: { type: 'File' },
					},
					permissions: {
						read: { requireAuthentication: false },
						create: { requireAuthentication: false },
						update: { requireAuthentication: false },
						delete: { requireAuthentication: false },
					},
				},
			],
			{ isProduction: true },
		)

		wabe = setup.wabe
	})

	afterAll(async () => {
		await closeTests(wabe)
	})

	afterEach(async () => {
		await wabe.controllers.database.deleteObjects({
			// @ts-expect-error
			className: 'TestSecurityFile',
			context: {
				isRoot: true,
				wabe,
			},
			where: {},
			select: {},
		})
	})

	it('should randomize uploaded file name in production', async () => {
		await wabe.controllers.database.createObject({
			// @ts-expect-error
			className: 'TestSecurityFile',
			context: {
				isRoot: true,
				wabe,
			},
			data: {
				// @ts-expect-error
				file: {
					file: new File(['hello'], 'report.txt', { type: 'text/plain' }),
				},
			},
			select: {},
		})

		const result = await wabe.controllers.database.getObjects({
			// @ts-expect-error
			className: 'TestSecurityFile',
			context: {
				isRoot: true,
				wabe,
			},
			where: {},
			// @ts-expect-error
			select: { file: true, id: true },
		})

		const storedName = (result[0] as any)?.file?.name as string

		expect(storedName).toBeString()
		expect(storedName).not.toEqual('report.txt')
		expect(storedName.endsWith('.txt')).toBe(true)
	})

	it('should reject file type not allowed in production', async () => {
		expect(
			wabe.controllers.database.createObject({
				// @ts-expect-error
				className: 'TestSecurityFile',
				context: {
					isRoot: true,
					wabe,
				},
				data: {
					// @ts-expect-error
					file: {
						file: new File(['alert(1)'], 'script.js', { type: 'application/javascript' }),
					},
				},
				select: {},
			}),
		).rejects.toThrow('File extension is not allowed')
	})
})
