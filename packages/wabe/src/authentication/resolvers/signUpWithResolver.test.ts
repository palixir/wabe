import { describe, expect, it, beforeEach, mock, spyOn } from 'bun:test'
import { signUpWithResolver } from './signUpWithResolver'
import { Session } from '../Session'

describe('SignUpWith', () => {
  const mockOnLogin = mock(() =>
    Promise.resolve({
      user: {
        id: 'id',
      },
    }),
  )
  const mockOnSignUp = mock(() =>
    Promise.resolve({
      authenticationDataToSave: {
        email: 'email@com.fr',
        password: 'password',
      },
    }),
  )

  const mockCreateObject = mock(() => Promise.resolve({ id: 'userId' }))

  const mockDatabaseController = {
    createObject: mockCreateObject,
  }

  const config = {
    authentication: {
      session: {
        cookieSession: true,
      },
      customAuthenticationMethods: [
        {
          name: 'emailPassword',
          input: {
            email: { type: 'Email', required: true },
            password: { type: 'String', required: true },
          },
          provider: {
            onSignUp: mockOnSignUp,
            onSignIn: mockOnLogin,
          },
        },
      ],
    },
    schema: {
      classes: [
        {
          name: 'User',
          fields: {},
          permissions: {
            create: {
              requireAuthentication: true,
            },
          },
        },
      ],
    },
  }

  const context = {
    wabe: {
      config,
      controllers: { database: mockDatabaseController },
    },
  } as any

  beforeEach(() => {
    mockCreateObject.mockClear()
    mockOnLogin.mockClear()
    mockOnSignUp.mockClear()
  })

  it('should block the signUpWith if the user creation is blocked for anonymous (the creation is done with root to avoid ACL issues)', async () => {
    const res = await signUpWithResolver(
      {},
      {
        input: {
          authentication: {
            emailPassword: {
              email: 'email@test.fr',
              password: 'password',
            },
          },
        },
      },
      {
        ...context,
      } as any,
    )

    expect(res).toEqual({
      accessToken: null,
      refreshToken: null,
      id: null,
    })

    config.schema.classes[0].permissions.create.requireAuthentication = false
  })

  it('should signUpWith email and password when the user not exist', async () => {
    const mockCreateSession = spyOn(
      Session.prototype,
      'create',
    ).mockResolvedValue({
      id: 'sessionId',
      refreshToken: 'refreshToken',
      accessToken: 'accessToken',
    } as any)

    const mockSetCookie = mock(() => {})

    const mockResponse = {
      setCookie: mockSetCookie,
    }

    const res = await signUpWithResolver(
      {},
      {
        input: {
          authentication: {
            emailPassword: {
              email: 'email@test.fr',
              password: 'password',
            },
          },
        },
      },
      {
        ...context,
        response: mockResponse,
      } as any,
    )

    expect(res).toEqual({
      refreshToken: 'refreshToken',
      accessToken: 'accessToken',
      id: 'userId',
    })

    expect(mockCreateObject).toHaveBeenCalledTimes(1)
    expect(mockCreateObject).toHaveBeenCalledWith({
      className: 'User',
      data: {
        authentication: {
          emailPassword: {
            email: 'email@test.fr',
            password: 'password',
          },
        },
      },
      context: expect.any(Object),
      fields: ['id'],
    })

    expect(mockCreateSession).toHaveBeenCalledTimes(1)
    expect(mockCreateSession).toHaveBeenCalledWith('userId', expect.any(Object))

    expect(mockSetCookie).toHaveBeenCalledTimes(2)
    expect(mockSetCookie).toHaveBeenNthCalledWith(
      1,
      'refreshToken',
      'refreshToken',
      {
        httpOnly: true,
        path: '/',
        secure: true,
        sameSite: 'None',
        expires: expect.any(Date),
      },
    )
    expect(mockSetCookie).toHaveBeenNthCalledWith(
      2,
      'accessToken',
      'accessToken',
      {
        httpOnly: true,
        path: '/',
        secure: true,
        sameSite: 'None',
        expires: expect.any(Date),
      },
    )

    // @ts-expect-error
    const refreshTokenExpiresIn = mockSetCookie.mock.calls[0][2].expires
    // @ts-expect-error
    const accessTokenExpiresIn = mockSetCookie.mock.calls[1][2].expires

    // - 1000 to avoid flaky
    expect(new Date(refreshTokenExpiresIn).getTime()).toBeGreaterThanOrEqual(
      Date.now() + 1000 * 30 * 24 * 60 * 60 - 1000,
    )
    expect(new Date(accessTokenExpiresIn).getTime()).toBeGreaterThanOrEqual(
      Date.now() + 1000 * 15 * 60 - 1000,
    )

    expect(mockOnLogin).toHaveBeenCalledTimes(0)

    mockCreateSession.mockRestore()
  })
})
