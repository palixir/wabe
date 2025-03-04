import { afterEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { GitHub } from './GitHub'
import * as OAuth from './OAuth'
import { AuthenticationProvider } from '../interface'

// Use GitHub test as use case
describe('OAuth providers', () => {
  const mockGetObjects = mock(() => Promise.resolve([]))
  const mockCount = mock(() => Promise.resolve(0)) as any
  const mockCreateObject = mock(() => Promise.resolve({ id: 'userId' })) as any

  const mockGetUserInfo = mock().mockResolvedValue({
    email: 'email@test.fr',
    avatarUrl: 'avatarUrl',
    username: 'username',
  })

  const mockValidateAuthorizationCode = mock().mockResolvedValue({
    accessToken: 'accessToken',
    refreshToken: 'refreshToken',
    accessTokenExpiresAt: new Date(0),
  })

  spyOn(OAuth, 'getProvider').mockReturnValue({
    validateAuthorizationCode: mockValidateAuthorizationCode,
    getUserInfo: mockGetUserInfo,
  } as never)

  const context = {
    wabe: {
      controllers: {
        database: {
          getObjects: mockGetObjects,
          createObject: mockCreateObject,
          count: mockCount,
        },
      },
      config: {
        authentication: {
          providers: {
            github: {
              clientId: 'clientId',
              clientSecret: 'clientSecret',
            },
          },
        },
      },
    },
  } as any

  afterEach(() => {
    mockGetObjects.mockClear()
    mockCreateObject.mockClear()
    mockCount.mockClear()
    mockValidateAuthorizationCode.mockClear()
    mockGetUserInfo.mockClear()
  })

  it('should sign up with GitHub Provider if there is no user found', async () => {
    const github = new GitHub()

    await github.onSignIn({
      context,
      input: {
        authorizationCode: 'authorizationCode',
        codeVerifier: 'codeVerifier',
      },
    })

    expect(mockValidateAuthorizationCode).toHaveBeenCalledTimes(1)
    expect(mockGetUserInfo).toHaveBeenCalledTimes(1)

    expect(mockGetObjects).toHaveBeenCalledTimes(1)
    expect(mockGetObjects).toHaveBeenCalledWith({
      className: 'User',
      where: {
        authentication: {
          github: {
            email: { equalTo: 'email@test.fr' },
          },
        },
      },
      first: 1,
      context: expect.any(Object),
      select: { id: true },
    })

    expect(mockCreateObject).toHaveBeenCalledTimes(1)
    expect(mockCreateObject).toHaveBeenCalledWith({
      className: 'User',
      data: {
        provider: AuthenticationProvider.GitHub,
        isOauth: true,
        authentication: {
          github: {
            email: 'email@test.fr',
            username: 'username',
            avatarUrl: 'avatarUrl',
          },
        },
      },
      context: expect.any(Object),
    })
  })

  it('should sign in with GitHub Provider if there is no user found', async () => {
    mockGetObjects.mockResolvedValue([
      {
        id: 'userId',
        authentication: {
          github: {
            email: 'email@test.fr',
            verifiedEmail: true,
            idToken: 'idToken',
          },
        },
        provider: AuthenticationProvider.Google,
        isOauth: true,
      } as any,
    ] as never)

    const github = new GitHub()

    await github.onSignIn({
      context,
      input: {
        authorizationCode: 'authorizationCode',
        codeVerifier: 'codeVerifier',
      },
    })

    expect(mockValidateAuthorizationCode).toHaveBeenCalledTimes(1)
    expect(mockGetUserInfo).toHaveBeenCalledTimes(1)

    expect(mockGetObjects).toHaveBeenCalledTimes(1)
    expect(mockGetObjects).toHaveBeenCalledWith({
      className: 'User',
      where: {
        authentication: {
          github: {
            email: { equalTo: 'email@test.fr' },
          },
        },
      },
      first: 1,
      context: expect.any(Object),
      select: { id: true },
    })

    expect(mockCreateObject).toHaveBeenCalledTimes(0)

    mockValidateAuthorizationCode.mockRestore()
  })
})
