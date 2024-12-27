import { afterEach, describe, expect, it, mock, spyOn } from 'bun:test'
import { Google } from './Google'
import { Google as GoogleOauth } from '../oauth/Google'
import { AuthenticationProvider } from '../interface'

describe('Google providers', () => {
  const mockGetObjects = mock(() => Promise.resolve([]))
  const mockCount = mock(() => Promise.resolve(0)) as any
  const mockCreateObject = mock(() => Promise.resolve({ id: 'userId' })) as any

  const mockGetUserInfo = spyOn(
    GoogleOauth.prototype,
    'getUserInfo',
  ).mockResolvedValue({
    email: 'email@test.fr',
    verifiedEmail: true,
  })

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
            google: {
              clientId: 'clientId',
              clientSecret: 'clientSecret',
            },
          },
        },
      },
    },
  } as any

  afterEach(() => {
    mockGetObjects.mockRestore()
    mockCreateObject.mockClear()
    mockCount.mockClear()
    mockGetUserInfo.mockClear()
  })

  it('should sign up with Google Provider if there is no user found', async () => {
    const mockValidateAuthorizationCode = spyOn(
      GoogleOauth.prototype,
      'validateAuthorizationCode',
    ).mockResolvedValue({
      idToken: 'idToken',
      accessToken: 'accessToken',
      refreshToken: 'refreshToken',
      accessTokenExpiresAt: new Date(0),
    })

    const google = new Google()

    await google.onSignIn({
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
          google: {
            email: { equalTo: 'email@test.fr' },
          },
        },
      },
      first: 1,
      context: expect.any(Object),
      fields: ['id'],
    })

    expect(mockCreateObject).toHaveBeenCalledTimes(1)
    expect(mockCreateObject).toHaveBeenCalledWith({
      className: 'User',
      data: {
        provider: AuthenticationProvider.Google,
        isOauth: true,
        authentication: {
          google: {
            email: 'email@test.fr',
            verifiedEmail: true,
            idToken: 'idToken',
          },
        },
      },
      context: expect.any(Object),
      fields: ['*', 'id'],
    })

    mockValidateAuthorizationCode.mockRestore()
  })

  it('should sign in with Google Provider if there is no user found', async () => {
    const mockValidateAuthorizationCode = spyOn(
      GoogleOauth.prototype,
      'validateAuthorizationCode',
    ).mockResolvedValue({
      idToken: 'idToken',
      accessToken: 'accessToken',
      refreshToken: 'refreshToken',
      accessTokenExpiresAt: new Date(0),
    })

    mockGetObjects.mockResolvedValue([
      {
        id: 'userId',
        authentication: {
          google: {
            email: 'email@test.fr',
            verifiedEmail: true,
            idToken: 'idToken',
          },
        },
        provider: AuthenticationProvider.Google,
        isOauth: true,
      } as any,
    ] as never)

    const google = new Google()

    await google.onSignIn({
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
          google: {
            email: { equalTo: 'email@test.fr' },
          },
        },
      },
      first: 1,
      context: expect.any(Object),
      fields: ['id'],
    })

    expect(mockCreateObject).toHaveBeenCalledTimes(0)

    mockValidateAuthorizationCode.mockRestore()
  })
})
