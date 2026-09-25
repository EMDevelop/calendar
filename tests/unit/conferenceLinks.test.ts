import { describe, expect, it } from 'vitest'
import {
  isAllowedMeetingUrl,
  parseAllowedUrl,
  resolveConferenceUrl,
} from '../../src/main/calendar/conferenceLinks.ts'

/** The allowlist is the gate between hostile invite text and openExternal (§8.6). */
describe('meeting link allowlist', () => {
  it('accepts the supported meeting hosts over https', () => {
    expect(isAllowedMeetingUrl('https://meet.google.com/abc-defg-hij')).toBe(true)
    expect(isAllowedMeetingUrl('https://zoom.us/j/123')).toBe(true)
    expect(isAllowedMeetingUrl('https://acme.zoom.us/j/123')).toBe(true)
    expect(isAllowedMeetingUrl('https://teams.microsoft.com/l/meetup-join/x')).toBe(true)
    expect(isAllowedMeetingUrl('https://teams.live.com/meet/x')).toBe(true)
  })

  it('rejects any scheme other than https', () => {
    expect(isAllowedMeetingUrl('http://meet.google.com/abc')).toBe(false)
    expect(isAllowedMeetingUrl('file:///etc/passwd')).toBe(false)
    expect(isAllowedMeetingUrl('javascript:alert(1)')).toBe(false)
    expect(isAllowedMeetingUrl('smb://share/evil')).toBe(false)
    expect(isAllowedMeetingUrl('zoommtg://zoom.us/join?confno=1')).toBe(false)
  })

  it('rejects look-alike hosts', () => {
    expect(isAllowedMeetingUrl('https://evilzoom.us/j/1')).toBe(false)
    expect(isAllowedMeetingUrl('https://zoom.us.evil.example/j/1')).toBe(false)
    expect(isAllowedMeetingUrl('https://meet.google.com.evil.example/x')).toBe(false)
    expect(isAllowedMeetingUrl('https://notmeet.google.com/x')).toBe(false)
  })

  it('rejects embedded credentials, which disguise the real host', () => {
    expect(isAllowedMeetingUrl('https://meet.google.com@evil.example/x')).toBe(false)
    expect(isAllowedMeetingUrl('https://user:pass@zoom.us/j/1')).toBe(false)
  })

  it('rejects malformed input', () => {
    expect(parseAllowedUrl('')).toBeNull()
    expect(parseAllowedUrl('not a url')).toBeNull()
  })
})

describe('resolveConferenceUrl', () => {
  it('prefers structured fields over free text', () => {
    const resolved = resolveConferenceUrl({
      structured: [null, 'https://meet.google.com/aaa-bbbb-ccc'],
      text: ['join at https://acme.zoom.us/j/999'],
    })
    expect(resolved).toBe('https://meet.google.com/aaa-bbbb-ccc')
  })

  it('falls back to scanning text, stripping trailing punctuation', () => {
    const resolved = resolveConferenceUrl({
      text: ['Dial in via https://acme.zoom.us/j/999, or call in.'],
    })
    expect(resolved).toBe('https://acme.zoom.us/j/999')
  })

  it('ignores links in text that are not on the allowlist', () => {
    const resolved = resolveConferenceUrl({
      structured: ['https://evil.example/pwn'],
      text: ['see https://phishing.example/login'],
    })
    expect(resolved).toBeUndefined()
  })

  it('returns undefined when there is nothing to join', () => {
    expect(resolveConferenceUrl({})).toBeUndefined()
    expect(resolveConferenceUrl({ structured: [undefined, null], text: [''] })).toBeUndefined()
  })
})
