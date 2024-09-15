import { describe, expect, it, mock, afterEach } from 'bun:test'
import { initializeRoles } from './roles'

describe('Roles', () => {
  const mockCreateObjects = mock(() => {})
  const mockGetObjects = mock(() => {})

  const wabe = {
    config: {
      authentication: {
        roles: ['Role1', 'Role2'],
      },
    },
    controllers: {
      database: {
        getObjects: mockGetObjects,
        createObjects: mockCreateObjects,
      },
    },
  } as any

  afterEach(() => {
    mockCreateObjects.mockClear()
    mockGetObjects.mockClear()
  })

  it("should not create a role if it's already created", async () => {
    mockGetObjects.mockResolvedValueOnce([
      { name: 'Role1' },
      { name: 'Role2' },
    ] as never)

    await initializeRoles(wabe)

    expect(mockCreateObjects).toHaveBeenCalledTimes(0)
  })

  it('should create only one role if one of them is already created', async () => {
    mockGetObjects.mockResolvedValueOnce([{ name: 'Role1' }] as never)

    await initializeRoles(wabe)

    expect(mockCreateObjects).toHaveBeenCalledTimes(1)
    expect(mockCreateObjects).toHaveBeenCalledWith({
      className: 'Role',
      context: { isRoot: true, wabe: wabe },
      data: [{ name: 'Role2' }],
      fields: [],
    })
  })

  it('should create all roles', async () => {
    mockGetObjects.mockResolvedValueOnce([] as never)

    await initializeRoles(wabe)

    expect(mockCreateObjects).toHaveBeenCalledTimes(1)
    expect(mockCreateObjects).toHaveBeenCalledWith({
      className: 'Role',
      context: { isRoot: true, wabe: wabe },
      data: [{ name: 'Role1' }, { name: 'Role2' }],
      fields: [],
    })
  })

  it('should not call database if there is no roles', async () => {
    await initializeRoles({
      controllers: {
        database: {
          createObjects: mockCreateObjects,
        },
      },
      authentication: {
        roles: [],
      },
    } as any)

    expect(mockCreateObjects).toHaveBeenCalledTimes(0)
  })
})
