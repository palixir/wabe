import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	spyOn,
} from 'bun:test'
import type { Wabe } from '..'
import { type DevWabeTypes, closeTests, setupTests } from '../utils/helper'

describe('File upload', () => {
	let wabe: Wabe<DevWabeTypes>
	let port: number
	let spyFileDevAdapter: any

	beforeAll(async () => {
		const setup = await setupTests()
		wabe = setup.wabe
		port = setup.port

		const fileAdapter = wabe.config.file

		if (!fileAdapter)
			throw new Error('File adapter is not correctly setup in setupTests')

		spyFileDevAdapter = spyOn(fileAdapter, 'adapter')
	})

	afterAll(async () => {
		await closeTests(wabe)
	})

	beforeEach(() => {
		spyFileDevAdapter.mockClear()
	})

	it('should upload a file on request on type File on create request', async () => {
		const formData = new FormData()

		formData.append(
			'operations',
			JSON.stringify({
				query:
					'mutation ($file: File!) {createTest3(input: {fields: {file: $file}}){test3{id, file}}}',
				variables: { file: null },
			}),
		)

		formData.append('map', JSON.stringify({ 0: ['variables.file'] }))

		formData.append('0', new File(['a'], 'a.text', { type: 'text/plain' }))

		const res = await fetch(`http://127.0.0.1:${port}/graphql`, {
			method: 'POST',
			body: formData,
		})

		const jsonRes = JSON.parse(await res.text())

		// Return the url in dev adapter it's the file name
		expect(jsonRes.data.createTest3.test3.file).toEqual('a.text')

		const fileArg = spyFileDevAdapter.mock.calls[0][0]

		expect(spyFileDevAdapter).toHaveBeenCalledTimes(1)
		expect(fileArg.name).toEqual('a.text')
		expect(await fileArg.text()).toEqual('a')
	})

	it('should upload a file on request on type File on update request', async () => {
		const formData = new FormData()

		formData.append(
			'operations',
			JSON.stringify({
				query:
					'mutation ($file: File!) {createTest3(input: {fields: {file: $file}}){test3{id, file}}}',
				variables: { file: null },
			}),
		)

		formData.append('map', JSON.stringify({ 0: ['variables.file'] }))

		formData.append('0', new File(['a'], 'a.text', { type: 'text/plain' }))

		const res = await fetch(`http://127.0.0.1:${port}/graphql`, {
			method: 'POST',
			body: formData,
		})

		const jsonRes = JSON.parse(await res.text())

		const idOfCreatedObject = jsonRes.data.createTest3.test3.id

		const formData2 = new FormData()

		formData2.append(
			'operations',
			JSON.stringify({
				query: `mutation ($file: File!) {updateTest3(input: {id: "${idOfCreatedObject}",fields: {file: $file}}){test3{id, file}}}`,
				variables: { file: null },
			}),
		)

		formData2.append('map', JSON.stringify({ 0: ['variables.file'] }))

		formData2.append('0', new File(['b'], 'b.text', { type: 'text/plain' }))

		const updatedRes = await fetch(`http://127.0.0.1:${port}/graphql`, {
			method: 'POST',
			body: formData2,
		})

		const jsonUpdatedRes = JSON.parse(await updatedRes.text())

		// Return the url in dev adapter it's the file name
		expect(jsonUpdatedRes.data.updateTest3.test3.file).toEqual('b.text')

		const fileArg = spyFileDevAdapter.mock.calls[1][0]

		// 2 for create and update
		expect(spyFileDevAdapter).toHaveBeenCalledTimes(2)
		expect(fileArg.name).toEqual('b.text')
		expect(await fileArg.text()).toEqual('b')
	})
})
