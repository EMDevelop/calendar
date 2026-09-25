import { describe, expect, it } from 'vitest'
import {
  dedupeForMergedView,
  partitionByAllDay,
  sortEvents,
} from '../../src/main/calendar/EventAggregator.ts'
import type { CalendarEvent } from '../../src/shared/types/calendar.ts'

function event(overrides: Partial<CalendarEvent> & { id: string }): CalendarEvent {
  return {
    accountId: 'work',
    calendarId: 'primary',
    iCalUID: 'uid@google',
    title: 'Meeting',
    start: '2026-09-25T10:00:00.000Z',
    end: '2026-09-25T10:30:00.000Z',
    isAllDay: false,
    ...overrides,
  }
}

describe('sortEvents', () => {
  it('orders by start time', () => {
    const sorted = sortEvents([
      event({ id: 'b', start: '2026-09-25T11:00:00.000Z' }),
      event({ id: 'a', start: '2026-09-25T09:00:00.000Z' }),
    ])
    expect(sorted.map((item) => item.id)).toEqual(['a', 'b'])
  })

  it('is stable for events at the same time', () => {
    const sorted = sortEvents([
      event({ id: 'z', title: 'Zebra' }),
      event({ id: 'a', title: 'Apple' }),
    ])
    expect(sorted.map((item) => item.id)).toEqual(['a', 'z'])
  })

  it('does not mutate its input', () => {
    const input = [event({ id: 'b', start: '2026-09-25T11:00:00.000Z' }), event({ id: 'a' })]
    sortEvents(input)
    expect(input.map((item) => item.id)).toEqual(['b', 'a'])
  })
})

describe('dedupeForMergedView', () => {
  it('shows one copy of a meeting invited to both accounts', () => {
    const merged = dedupeForMergedView(
      [
        event({ id: 'work-copy', accountId: 'work' }),
        event({ id: 'personal-copy', accountId: 'personal' }),
      ],
      ['work', 'personal'],
    )

    expect(merged).toHaveLength(1)
    expect(merged[0]!.accountId).toBe('work')
  })

  it('keeps the first account in settings order', () => {
    const merged = dedupeForMergedView(
      [
        event({ id: 'work-copy', accountId: 'work' }),
        event({ id: 'personal-copy', accountId: 'personal' }),
      ],
      ['personal', 'work'],
    )

    expect(merged[0]!.accountId).toBe('personal')
  })

  it('keeps the same meeting at different times apart', () => {
    const merged = dedupeForMergedView(
      [
        event({ id: 'morning', start: '2026-09-25T09:00:00.000Z' }),
        event({ id: 'afternoon', start: '2026-09-25T14:00:00.000Z' }),
      ],
      ['work'],
    )

    expect(merged).toHaveLength(2)
  })

  it('never merges events that carry no shared identifier', () => {
    const merged = dedupeForMergedView(
      [
        event({ id: 'one', iCalUID: '', accountId: 'work' }),
        event({ id: 'two', iCalUID: '', accountId: 'personal' }),
      ],
      ['work', 'personal'],
    )

    expect(merged).toHaveLength(2)
  })
})

describe('partitionByAllDay', () => {
  it('separates all-day events from the timeline', () => {
    const { timed, allDay } = partitionByAllDay([
      event({ id: 'meeting' }),
      event({ id: 'leave', isAllDay: true }),
    ])

    expect(timed.map((item) => item.id)).toEqual(['meeting'])
    expect(allDay.map((item) => item.id)).toEqual(['leave'])
  })
})
