import { beforeEach, describe, expect, it } from 'vitest'
import { AgendaService } from '../../src/main/agenda/AgendaService.ts'
import type { SettingsReader } from '../../src/main/storage/SettingsStore.ts'
import { DEFAULT_SETTINGS } from '../../src/main/storage/schema.ts'
import type { AppSettings } from '../../src/shared/types/settings.ts'
import type { CalendarEvent } from '../../src/shared/types/calendar.ts'

/**
 * The one snapshot the widget, the tray and notifications all read (§5), and
 * the only place meeting URLs live (§8.6).
 */

const NOW = new Date('2026-09-25T10:00:00.000Z')

function settingsWith(overrides: Partial<AppSettings>): SettingsReader {
  const settings: AppSettings = {
    ...DEFAULT_SETTINGS,
    accounts: [
      { id: 'work', provider: 'google', label: 'Work', colour: 'sky', calendarIds: ['primary'] },
      {
        id: 'personal',
        provider: 'google',
        label: 'Personal',
        colour: 'violet',
        calendarIds: ['primary'],
      },
    ],
    ...overrides,
  }
  return { getSettings: () => settings }
}

function event(overrides: Partial<CalendarEvent> & { id: string }): CalendarEvent {
  return {
    accountId: 'work',
    calendarId: 'primary',
    iCalUID: 'uid@google',
    title: 'Design review',
    start: '2026-09-25T10:30:00.000Z',
    end: '2026-09-25T11:00:00.000Z',
    isAllDay: false,
    ...overrides,
  }
}

let service: AgendaService

beforeEach(() => {
  service = new AgendaService(settingsWith({}), () => NOW)
})

describe('AgendaService snapshots', () => {
  it('tags each event with its account colour', () => {
    service.setEvents('work', [event({ id: 'a' })])
    service.setEvents('personal', [event({ id: 'b', accountId: 'personal', iCalUID: 'other' })])

    const snapshot = service.getSnapshot()
    const colours = new Map(snapshot.timed.map((item) => [item.accountId, item.colour]))

    expect(colours.get('work')).toBe('sky')
    expect(colours.get('personal')).toBe('violet')
  })

  it('separates all-day events from the timeline', () => {
    service.setEvents('work', [
      event({ id: 'meeting' }),
      event({ id: 'leave', isAllDay: true, iCalUID: 'leave' }),
    ])

    const snapshot = service.getSnapshot()
    expect(snapshot.timed.map((item) => item.id)).toEqual(['meeting'])
    expect(snapshot.allDay.map((item) => item.id)).toEqual(['leave'])
  })

  it('emits a snapshot whenever events change', () => {
    const seen: number[] = []
    service.snapshotChanged.subscribe((snapshot) => {
      seen.push(snapshot.timed.length)
    })

    service.setEvents('work', [event({ id: 'a' })])
    service.setEvents('work', [event({ id: 'a' }), event({ id: 'b', iCalUID: 'b' })])

    expect(seen).toEqual([1, 2])
  })

  it('reports per-account status and last sync time', () => {
    service.setStatus('work', 'ready', '2026-09-25T09:59:00.000Z')
    service.setStatus('personal', 'needsReauth')

    const accounts = new Map(service.getSnapshot().accounts.map((a) => [a.id, a]))
    expect(accounts.get('work')?.status).toBe('ready')
    expect(accounts.get('work')?.lastSyncedAt).toBe('2026-09-25T09:59:00.000Z')
    expect(accounts.get('personal')?.status).toBe('needsReauth')
  })

  it('forgets an account entirely', () => {
    service.setEvents('work', [event({ id: 'a' })])
    service.forget('work')

    expect(service.getSnapshot().timed).toHaveLength(0)
  })
})

describe('AgendaService view modes', () => {
  const sharedMeeting = (accountId: string, id: string): CalendarEvent =>
    event({ id, accountId, iCalUID: 'shared-uid' })

  it('shows a meeting invited to both accounts once in merged view', () => {
    service.setEvents('work', [sharedMeeting('work', 'work-copy')])
    service.setEvents('personal', [sharedMeeting('personal', 'personal-copy')])

    const snapshot = service.getSnapshot()
    expect(snapshot.timed).toHaveLength(1)
    expect(snapshot.timed[0]!.accountId).toBe('work')
  })

  it('shows both copies in split view', () => {
    const split = new AgendaService(settingsWith({ viewMode: 'split' }), () => NOW)
    split.setEvents('work', [sharedMeeting('work', 'work-copy')])
    split.setEvents('personal', [sharedMeeting('personal', 'personal-copy')])

    expect(split.getSnapshot().timed).toHaveLength(2)
  })
})

describe('AgendaService privacy mode', () => {
  it('replaces titles before they can leave main', () => {
    const priv = new AgendaService(settingsWith({ privacyMode: true }), () => NOW)
    priv.setEvents('work', [event({ id: 'a', title: 'Board pay review' })])

    const snapshot = priv.getSnapshot()
    expect(snapshot.privacyMode).toBe(true)
    expect(JSON.stringify(snapshot)).not.toContain('Board pay review')
  })
})

describe('AgendaService meeting links', () => {
  const withLink = event({ id: 'joinable', conferenceUrl: 'https://meet.google.com/abc-defg-hij' })

  it('keeps the URL in main and out of the snapshot', () => {
    service.setEvents('work', [withLink])

    const snapshot = service.getSnapshot()
    expect(snapshot.timed[0]!.canJoin).toBe(true)
    expect(JSON.stringify(snapshot)).not.toContain('meet.google.com')
  })

  it('resolves the URL by event id for the join path', () => {
    service.setEvents('work', [withLink])

    expect(service.findConferenceUrl('joinable')).toBe('https://meet.google.com/abc-defg-hij')
  })

  it('returns nothing for an unknown or link-free event', () => {
    service.setEvents('work', [withLink, event({ id: 'plain', iCalUID: 'plain' })])

    expect(service.findConferenceUrl('plain')).toBeNull()
    expect(service.findConferenceUrl('made-up-id')).toBeNull()
  })

  it('forgets links belonging to a removed account', () => {
    service.setEvents('work', [withLink])
    service.forget('work')

    expect(service.findConferenceUrl('joinable')).toBeNull()
  })
})
