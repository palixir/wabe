import { describe, expect, it, spyOn } from 'bun:test'
import { signOutResolver } from './signOutResolver'
import type { WabeContext } from '../../server/interface'
import { Session } from '../Session'

describe('signOut', () => {
  it('should sign out the current user', async () => {
    const spyDeleteSession = spyOn(
      Session.prototype,
      'delete',
    ).mockResolvedValue(undefined)

    await signOutResolver(undefined, {}, {
      sessionId: 'sessionId',
    } as WabeContext<any>)

    expect(spyDeleteSession).toHaveBeenCalledTimes(1)
    expect(spyDeleteSession).toHaveBeenCalledWith({
      sessionId: 'sessionId',
    })
  })
})
