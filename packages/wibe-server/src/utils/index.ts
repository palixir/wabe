import { getSdk } from '../../generated/wibe'
import { WibeApp } from '../server'
import { getGraphqlClient } from './helper'

export const getClient = () => {
    if (!WibeApp.config.port)
        throw new Error('WibeApp.config.port is not defined')

    const client = getGraphqlClient(WibeApp.config.port)

    return getSdk(client)
}
