import { describe, expect, it } from 'vitest'
import { findNextUp, statusFor, toAgendaItem } from '../../src/main/calendar/EventEnricher.ts'
import type { CalendarEvent } from '../../src/shared/types/calendar.ts'

/** `now` is always a parameter, which is what makes these rules testable (§4). */
const NOW = new Date('2026-09-25T10:00:00.000Z')

function event(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'acc:cal:evt',
    accountId: 'acc',
    calendarId: 'cal',
    iCalUID: 'uid@google',
    title: 'Design review',
    start: '2026-09-25T10:30:00.000Z',
    end: '2026-09-25T11:00:00.000Z',
    isAllDay: false,
    ...overrides,
  }
}

describe('statusFor', () => {
  it('marks a finished event as past', () => {
    const past = event({ start: '2026-09-25T09:00:00.000Z', end: '2026-09-25T09:30:00.000Z' })
    expect(statusFor(past, NOW)).toBe('past')
  })

  it('marks an event in progress as live', () => {
    const live = event({ start: '2026-09-25T09:50:00.000Z', end: '2026-09-25T10:20:00.000Z' })
    expect(statusFor(live, NOW)).toBe('live')
  })

  it('marks an event starting within 15 minutes as imminent', () => {
    expect(statusFor(event({ start: '2026-09-25T10:10:00.000Z' }), NOW)).toBe('imminent')
    expect(statusFor(event({ start: '2026-09-25T10:15:00.000Z' }), NOW)).toBe('imminent')
  })

  it('leaves anything further out as upcoming', () => {
    expect(statusFor(event({ start: '2026-09-25T10:16:00.000Z' }), NOW)).toBe('upcoming')
  })

  it('never treats an all-day event as urgent', () => {
    const allDay = event({
      isAllDay: true,
      start: '2026-09-25T00:00:00.000Z',
      end: '2026-09-26T00:00:00.000Z',
    })
    expect(statusFor(allDay, NOW)).toBe('upcoming')
  })
})

describe('toAgendaItem', () => {
  const context = { now: NOW, colour: 'sky', privacyMode: false } as const

  it('produces a view model with no meeting URL in it', () => {
    const item = toAgendaItem(event({ conferenceUrl: 'https://meet.google.com/x' }), context)

    expect(item.canJoin).toBe(true)
    expect(JSON.stringify(item)).not.toContain('meet.google.com')
  })

  it('reports how long until the event starts', () => {
    const item = toAgendaItem(event({ start: '2026-09-25T10:30:00.000Z' }), context)
    expect(item.startsInMinutes).toBe(30)
  })

  it('replaces the title in privacy mode before it can leave main', () => {
    const item = toAgendaItem(event(), { ...context, privacyMode: true })

    expect(item.title).toBe('Busy')
    expect(item.title).not.toContain('Design review')
  })

  it('falls back when an event has no usable title', () => {
    expect(toAgendaItem(event({ title: '   ' }), context).title).toBe('(no title)')
  })

  it('caps very long titles', () => {
    const item = toAgendaItem(event({ title: 'x'.repeat(500) }), context)
    expect(item.title.length).toBe(200)
  })
})

describe('findNextUp', () => {
  const context = { now: NOW, colour: 'sky', privacyMode: false } as const

  it('prefers an event in progress', () => {
    const items = [
      toAgendaItem(
        event({ id: 'live', start: '2026-09-25T09:50:00.000Z', end: '2026-09-25T10:20:00.000Z' }),
        context,
      ),
      toAgendaItem(event({ id: 'later' }), context),
    ]
    expect(findNextUp(items)?.id).toBe('live')
  })

  it('otherwise picks the soonest event still to come', () => {
    const items = [
      toAgendaItem(
        event({ id: 'past', start: '2026-09-25T08:00:00.000Z', end: '2026-09-25T08:30:00.000Z' }),
        context,
      ),
      toAgendaItem(event({ id: 'next' }), context),
    ]
    expect(findNextUp(items)?.id).toBe('next')
  })

  it('returns nothing when the day is done', () => {
    const items = [
      toAgendaItem(
        event({ id: 'past', start: '2026-09-25T08:00:00.000Z', end: '2026-09-25T08:30:00.000Z' }),
        context,
      ),
    ]
    expect(findNextUp(items)).toBeNull()
  })
})
