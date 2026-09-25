import { describe, expect, it } from 'vitest'
import { roleForSenderUrl } from '../../src/main/ipc/senderRole.ts'
import { CHANNEL_CALLERS, WINDOW_ROLES } from '../../src/shared/ipc/channels.ts'

const DEV_ORIGIN = 'http://localhost:5173'

/** Each window has its own origin so main can tell senders apart (§8.5). */
describe('roleForSenderUrl', () => {
  it('identifies each window by its app:// host', () => {
    expect(roleForSenderUrl('app://widget/index.html', null)).toBe('widget')
    expect(roleForSenderUrl('app://settings/index.html', null)).toBe('settings')
  })

  // Adding a window role and forgetting it here meant main rejected its own
  // window, so this asserts the whole list rather than naming roles by hand.
  it.each([...WINDOW_ROLES])('recognises the %s window', (role) => {
    expect(roleForSenderUrl(`app://${role}/index.html`, null)).toBe(role)
    expect(roleForSenderUrl(`${DEV_ORIGIN}/${role}/index.html`, DEV_ORIGIN)).toBe(role)
  })

  it('declares who may call every channel, for every role in use', () => {
    const rolesInUse = new Set(Object.values(CHANNEL_CALLERS).flat())

    for (const role of rolesInUse) {
      expect(WINDOW_ROLES).toContain(role)
    }
  })

  it('refuses anything that is not one of our windows', () => {
    expect(roleForSenderUrl('app://evil/index.html', null)).toBeNull()
    expect(roleForSenderUrl('https://evil.example/', null)).toBeNull()
    expect(roleForSenderUrl('file:///Users/me/index.html', null)).toBeNull()
    expect(roleForSenderUrl(undefined, null)).toBeNull()
    expect(roleForSenderUrl('not a url', null)).toBeNull()
  })

  it('refuses the dev server when the app is not in dev', () => {
    expect(roleForSenderUrl(`${DEV_ORIGIN}/widget/index.html`, null)).toBeNull()
  })

  it('accepts the dev server only for its own origin', () => {
    expect(roleForSenderUrl(`${DEV_ORIGIN}/widget/index.html`, DEV_ORIGIN)).toBe('widget')
    expect(roleForSenderUrl(`${DEV_ORIGIN}/settings/index.html`, DEV_ORIGIN)).toBe('settings')
    expect(roleForSenderUrl('http://localhost:9999/widget/index.html', DEV_ORIGIN)).toBeNull()
    expect(roleForSenderUrl(`${DEV_ORIGIN}/evil/index.html`, DEV_ORIGIN)).toBeNull()
  })
})
