import { describe, expect, it } from 'bun:test'
import { v4 as uuid } from 'uuid'
import getPort from 'get-port'
import { WibeApp } from '.'
import { DatabaseEnum } from '../database'

describe('Server', () => {
    it('should run server', async () => {
        const databaseId = uuid()

        const port = await getPort()
        const wibe = new WibeApp({
            database: {
                type: DatabaseEnum.Mongo,
                url: 'mongodb://127.0.0.1:27045',
                name: databaseId,
            },
            port,
            schema: {
                class: [
                    {
                        name: 'Collection1',
                        fields: { name: { type: 'String' } },
                    },
                ],
            },
        })

        await wibe.start()

        const res = await fetch(`http://127.0.0.1:${port}/health`)

        expect(res.status).toEqual(200)
        await wibe.close()
    })
})
