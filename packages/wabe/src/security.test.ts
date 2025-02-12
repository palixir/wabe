import { describe, beforeAll, afterAll, it, expect } from 'bun:test'
import { gql } from 'graphql-request'
import type { Wabe } from './server'
import {
  type DevWabeTypes,
  setupTests,
  closeTests,
  getAdminUserClient,
} from './utils/helper'

describe('Security tests', () => {
  let wabe: Wabe<DevWabeTypes>

  beforeAll(async () => {
    const setup = await setupTests()
    wabe = setup.wabe
  })

  afterAll(async () => {
    await closeTests(wabe)
  })

  it('should not be able to create / update / delete a role (except root)', async () => {
    const adminRole = await wabe.controllers.database.getObjects({
      className: 'Role',
      where: {
        name: { equalTo: 'Admin' },
      },
      first: 1,
      select: { id: true },
      context: {
        wabe,
        isRoot: true,
      },
    })

    const adminRoleId = adminRole[0]?.id

    const adminClient = await getAdminUserClient(wabe.config.port, wabe, {
      email: 'admin@wabe.dev',
      password: 'admin',
    })

    expect(
      adminClient.request<any>(gql`
      mutation deleteRole {
        deleteRole(input: { id: "${adminRoleId}" }) {
            role {
             id
            }
        }
      }
    `),
    ).rejects.toThrowError('Permission denied to delete class Role')

    expect(
      adminClient.request<any>(gql`
      mutation updateRole {
        updateRole(input: { id: "${adminRoleId}", fields: {name: "Admin2"} }) {
            role {
             id
            }
        }
      }
    `),
    ).rejects.toThrowError('Permission denied to update class Role')

    expect(
      adminClient.request<any>(gql`
      mutation createRole {
        createRole(input: { fields: {name: "Admin2"} }) {
            role {
             id
            }
        }
      }
    `),
    ).rejects.toThrowError('Permission denied to create class Role')
  })

  it('should not be able to create / update / delete a session (except root)', async () => {
    const adminClient = await getAdminUserClient(wabe.config.port, wabe, {
      email: 'admin2@wabe.dev',
      password: 'admin',
    })

    expect(
      adminClient.request<any>(gql`
      mutation create_Session {
        create_Session(input: { fields: {accessToken: "token"} }) {
            _session {
             id
            }
        }
      }
    `),
    ).rejects.toThrowError('Permission denied to create class _Session')

    const session = await wabe.controllers.database.createObject({
      className: '_Session',
      context: {
        wabe,
        isRoot: true,
      },
      data: {
        accessToken: 'token',
      },
      select: { id: true },
    })

    const sessionId = session?.id

    if (!sessionId) throw new Error('Session not created')

    expect(
      adminClient.request<any>(gql`
      mutation update_Session {
        update_Session(input: { id: "${sessionId}", fields: {accessToken: "token2"} }) {
            _session {
             id
            }
        }
      }
    `),
    ).rejects.toThrowError('Permission denied to update class _Session')

    expect(
      adminClient.request<any>(gql`
      mutation delete_Session {
        delete_Session(input: { id:"${sessionId}" }) {
            _session {
                id
            }
        }
      }
    `),
    ).rejects.toThrowError('Permission denied to delete class _Session')

    const sessionAfterDelete = await wabe.controllers.database.getObject({
      className: '_Session',
      id: sessionId || '',
      context: {
        wabe,
        isRoot: true,
      },
      select: { id: true },
    })

    expect(sessionAfterDelete?.id).toEqual(sessionId)
  })
})
