import type { calendar_v3 } from '@googleapis/calendar'
import { describe, expect, it } from 'vitest'
import {
  mapGoogleEvent,
  mapGoogleEvents,
} from '../../src/main/calendar/providers/google/googleEventMapper.ts'

const CONTEXT = { accountId: 'work', calendarId: 'primary' }

function raw(overrides: calendar_v3.Schema$Event = {}): calendar_v3.Schema$Event {
  return {
    id: 'evt-1',
    status: 'confirmed',
    summary: 'Design review',
    iCalUID: 'uid@google.com',
    start: { dateTime: '2026-09-25T10:00:00+02:00' },
    end: { dateTime: '2026-09-25T10:30:00+02:00' },
    ...overrides,
  }
}

describe('mapGoogleEvent', () => {
  it('maps Google vocabulary to ours', () => {
    const mapped = mapGoogleEvent(raw(), CONTEXT)

    expect(mapped).not.toBeNull()
    expect(mapped!.title).toBe('Design review')
    expect(mapped!.accountId).toBe('work')
    expect(mapped!.isAllDay).toBe(false)
    expect(mapped!.id).toContain('evt-1')
  })

  it('drops cancelled events', () => {
    expect(mapGoogleEvent(raw({ status: 'cancelled' }), CONTEXT)).toBeNull()
  })

  it('drops events you declined', () => {
    const declined = raw({ attendees: [{ self: true, responseStatus: 'declined' }] })
    expect(mapGoogleEvent(declined, CONTEXT)).toBeNull()
  })

  it('keeps events someone else declined', () => {
    const event = raw({
      attendees: [
        { self: true, responseStatus: 'accepted' },
        { email: 'other@example.com', responseStatus: 'declined' },
      ],
    })
    expect(mapGoogleEvent(event, CONTEXT)).not.toBeNull()
  })

  it('reads an all-day event as local midnight', () => {
    const allDay = raw({ start: { date: '2026-09-25' }, end: { date: '2026-09-26' } })
    const mapped = mapGoogleEvent(allDay, CONTEXT)

    expect(mapped!.isAllDay).toBe(true)
    expect(new Date(mapped!.start).getHours()).toBe(0)
  })

  it('takes a meeting link from the structured field', () => {
    const mapped = mapGoogleEvent(raw({ hangoutLink: 'https://meet.google.com/abc' }), CONTEXT)
    expect(mapped!.conferenceUrl).toBe('https://meet.google.com/abc')
  })

  it('takes a video entry point from conference data', () => {
    const mapped = mapGoogleEvent(
      raw({
        conferenceData: {
          entryPoints: [
            { entryPointType: 'phone', uri: 'tel:+441234567890' },
            { entryPointType: 'video', uri: 'https://acme.zoom.us/j/1' },
          ],
        },
      }),
      CONTEXT,
    )
    expect(mapped!.conferenceUrl).toBe('https://acme.zoom.us/j/1')
  })

  it('ignores a link that is not on the allowlist', () => {
    const mapped = mapGoogleEvent(
      raw({ location: 'https://evil.example/pwn', description: 'click https://phish.example' }),
      CONTEXT,
    )
    expect(mapped!.conferenceUrl).toBeUndefined()
  })

  it('caps a hostile title', () => {
    const mapped = mapGoogleEvent(raw({ summary: 'x'.repeat(5000) }), CONTEXT)
    expect(mapped!.title.length).toBe(200)
  })

  it('skips events with no usable time', () => {
    expect(mapGoogleEvent(raw({ start: {}, end: {} }), CONTEXT)).toBeNull()
    expect(mapGoogleEvent(raw({ start: { dateTime: 'nonsense' } }), CONTEXT)).toBeNull()
  })

  it('skips events with no id', () => {
    expect(mapGoogleEvent(raw({ id: null }), CONTEXT)).toBeNull()
  })
})

describe('mapGoogleEvents', () => {
  it('keeps only the events worth showing', () => {
    const mapped = mapGoogleEvents(
      [raw({ id: 'keep' }), raw({ id: 'drop', status: 'cancelled' })],
      CONTEXT,
    )

    expect(mapped).toHaveLength(1)
    expect(mapped[0]!.id).toContain('keep')
  })
})
