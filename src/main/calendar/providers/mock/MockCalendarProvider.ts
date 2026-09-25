import type {
  AccountId,
  CalendarEvent,
  CalendarId,
  CalendarSummary,
  ProviderKind,
  TimeRange,
} from '../../../../shared/types/calendar.ts'
import type { CalendarProvider } from '../../CalendarProvider.ts'

/**
 * Offline development and tests (docs/spec.md §10). The whole UI — countdown,
 * notifications, join button — is built against this before OAuth exists.
 */
export class MockCalendarProvider implements CalendarProvider {
  readonly kind: ProviderKind = 'mock'

  constructor(
    readonly accountId: AccountId,
    private readonly now: () => Date = () => new Date(),
  ) {}

  isAuthenticated(): boolean {
    return true
  }

  canListCalendars(): boolean {
    return true
  }

  listCalendars(): Promise<CalendarSummary[]> {
    return Promise.resolve([
      { id: 'primary', title: 'Primary', primary: true },
      { id: 'team', title: 'Team', primary: false },
    ])
  }

  fetchEvents(_calendarIds: readonly CalendarId[], range: TimeRange): Promise<CalendarEvent[]> {
    const rangeStart = Date.parse(range.start)
    const rangeEnd = Date.parse(range.end)

    const candidates = [
      this.event('mock-standup', 'Team standup', -75, -60),
      this.event('mock-review', 'Design review', -10, 20, 'https://meet.google.com/abc-defg-hij'),
      this.event('mock-1-1', '1:1 with Sam', 8, 38, 'https://acme.zoom.us/j/1234567890'),
      this.event(
        'mock-retro',
        'Sprint retro',
        95,
        145,
        'https://teams.microsoft.com/l/meetup-join/x',
      ),
      this.allDayEvent('mock-leave', 'Jordan on leave'),
    ]

    const withinToday = candidates.filter((event) => {
      const start = Date.parse(event.start)
      return start >= rangeStart && start < rangeEnd
    })
    return Promise.resolve(withinToday)
  }

  disconnect(): Promise<void> {
    // Nothing to revoke.
    return Promise.resolve()
  }

  private event(
    id: string,
    title: string,
    startOffsetMinutes: number,
    endOffsetMinutes: number,
    conferenceUrl?: string,
  ): CalendarEvent {
    const now = this.now()
    const start = new Date(now.getTime() + startOffsetMinutes * 60_000)
    const end = new Date(now.getTime() + endOffsetMinutes * 60_000)

    return {
      id: `${this.accountId}:${id}`,
      accountId: this.accountId,
      calendarId: 'primary',
      iCalUID: `${id}@mock`,
      title,
      start: start.toISOString(),
      end: end.toISOString(),
      isAllDay: false,
      ...(conferenceUrl ? { conferenceUrl } : {}),
    }
  }

  private allDayEvent(id: string, title: string): CalendarEvent {
    const start = new Date(this.now())
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setDate(end.getDate() + 1)

    return {
      id: `${this.accountId}:${id}`,
      accountId: this.accountId,
      calendarId: 'primary',
      iCalUID: `${id}@mock`,
      title,
      start: start.toISOString(),
      end: end.toISOString(),
      isAllDay: true,
    }
  }
}
