import { describe, expect, it, beforeEach, mock, spyOn } from 'bun:test'
import { signInWithResolver } from './signInWithResolver'
import { Session } from '../Session'

describe('SignInWith', () => {
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
        id: 'id',
      },
    }),
  )

  const mockCreateObject = mock(() => Promise.resolve({}))

  const mockOnSendChallenge = mock(() => Promise.resolve())
  const mockOnVerifyChallenge = mock(() => Promise.resolve(true))

  const context = {
    wabe: {
      config: {
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
            {
              name: 'otp',
              input: {
                code: {
                  type: 'String',
                  required: true,
                },
              },
              provider: {
                onSendChallenge: mockOnSendChallenge,
                onVerifyChallenge: mockOnVerifyChallenge,
              },
            },
          ],
        },
      },
    },
  }

  beforeEach(() => {
    mockCreateObject.mockClear()
    mockOnLogin.mockClear()
    mockOnSignUp.mockClear()
  })

  it('should call the secondary factor authentication on signIn', async () => {
    const res = await signInWithResolver(
      {},
      {
        input: {
          authentication: {
            emailPassword: {
              email: 'email@test.fr',
              password: 'password',
            },
            // @ts-expect-error
            secondaryFactor: 'otp', // Use hardcoded value to avoid dependency on the generated code
          },
        },
      },
      context,
    )

    expect(mockOnLogin).toHaveBeenCalledTimes(1)
    expect(mockOnLogin).toHaveBeenCalledWith({
      input: {
        email: 'email@test.fr',
        password: 'password',
      },
      context: expect.any(Object),
    })

    expect(mockOnSendChallenge).toHaveBeenCalledTimes(1)

    expect(res).toEqual({
      accessToken: null,
      refreshToken: null,
      id: 'id',
    })
  })

  it('should throw an error if no custom authentication configuration is provided', async () => {
    expect(
      signInWithResolver(
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
        { wabe: { config: { authentication: undefined } } } as any,
      ),
    ).rejects.toThrow('No custom authentication methods found')
  })

  it('should throw an error if a custom authentication is provided but not in the custom authentication config', async () => {
    expect(
      signInWithResolver(
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
          wabe: {
            config: {
              authentication: {
                customAuthenticationMethods: [
                  {
                    name: 'phonePassword',
                    input: {
                      email: {
                        type: 'Email',
                        required: true,
                      },
                      password: {
                        type: 'String',
                        required: true,
                      },
                    },
                    provider: {
                      onSignUp: mockOnSignUp,
                      onSignIn: mockOnLogin,
                    },
                  },
                ],
              },
            },
          },
        } as any,
      ),
    ).rejects.toThrow('No available custom authentication methods found')
  })

  it('should signInWith email and password when the user already exist (on cookieSession)', async () => {
    const mockCreateSession = spyOn(
      Session.prototype,
      'create',
    ).mockResolvedValue({
      refreshToken: 'refreshToken',
      accessToken: 'accessToken',
    } as any)

    const mockSetCookie = mock(() => {})

    const mockResponse = {
      setCookie: mockSetCookie,
    }

    const res = await signInWithResolver(
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
      accessToken: 'accessToken',
      refreshToken: 'refreshToken',
      id: 'id',
    })
    expect(mockOnLogin).toHaveBeenCalledTimes(1)
    expect(mockOnLogin).toHaveBeenCalledWith({
      input: {
        email: 'email@test.fr',
        password: 'password',
      },
      context: expect.any(Object),
    })

    expect(mockSetCookie).toHaveBeenCalledTimes(2)
    expect(mockSetCookie).toHaveBeenNthCalledWith(
      1,
      'refreshToken',
      'refreshToken',
      {
        httpOnly: true,
        path: '/',
        secure: false,
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
        secure: false,
        expires: expect.any(Date),
      },
    )

    // @ts-expect-error
    const refreshTokenExpiresIn = mockSetCookie.mock.calls[0][2].expires
    // @ts-expect-error
    const accessTokenExpiresIn = mockSetCookie.mock.calls[1][2].expires

    // - 1000 to avoid flaky
    expect(refreshTokenExpiresIn.getTime() - Date.now()).toBeGreaterThanOrEqual(
      1000 * 30 * 24 * 60 * 60 - 1000,
    )
    expect(accessTokenExpiresIn.getTime() - Date.now()).toBeGreaterThanOrEqual(
      1000 * 15 * 60 - 1000,
    )

    expect(mockCreateSession).toHaveBeenCalledTimes(1)
    expect(mockCreateSession).toHaveBeenCalledWith('id', expect.anything())

    expect(mockOnSignUp).toHaveBeenCalledTimes(0)

    mockCreateSession.mockRestore()
  })
})
