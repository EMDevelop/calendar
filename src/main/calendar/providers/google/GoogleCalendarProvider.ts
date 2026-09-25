import { calendar, type calendar_v3 } from '@googleapis/calendar'
import { OAuth2Client } from 'google-auth-library'
import type {
  AccountId,
  CalendarEvent,
  CalendarId,
  CalendarSummary,
  ProviderKind,
  TimeRange,
} from '../../../../shared/types/calendar.ts'
import type { GoogleOAuthConfig } from '../../../infra/config.ts'
import { describeError } from '../../../infra/errors.ts'
import type { AppLogger } from '../../../infra/logger.ts'
import type { StoredCredential, TokenVault } from '../../../storage/TokenVault.ts'
import type { CalendarProvider } from '../../CalendarProvider.ts'
import { mapGoogleEvents } from './googleEventMapper.ts'
import { mapGoogleError } from './googleErrors.ts'
import { hasCalendarListScope } from './googleScopes.ts'

/**
 * Reads today's events from Google (docs/spec.md §7).
 *
 * Access-token refresh is the library's job; our job is to persist a rotated
 * refresh token and to make sure no raw vendor error escapes (§8.7).
 */

const MAX_EVENTS_PER_CALENDAR = 250

/** Excludes workingLocation and birthday entries, which are not meetings (§7). */
const EVENT_TYPES = ['default', 'focusTime', 'outOfOffice', 'fromGmail']

export class GoogleCalendarProvider implements CalendarProvider {
  readonly kind: ProviderKind = 'google'

  private readonly client: OAuth2Client
  private readonly api: calendar_v3.Calendar
  private readonly grantedScopes: readonly string[]

  constructor(
    readonly accountId: AccountId,
    config: GoogleOAuthConfig,
    credential: StoredCredential,
    private readonly vault: TokenVault,
    private readonly logger: AppLogger,
  ) {
    this.grantedScopes = credential.grantedScopes
    this.client = new OAuth2Client({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
    })
    this.client.setCredentials({ refresh_token: credential.refreshToken })
    this.api = calendar({ version: 'v3', auth: this.client })

    // Google occasionally issues a new refresh token; persist it or the next
    // launch signs in with a dead one.
    this.client.on('tokens', (tokens) => {
      const rotated = tokens.refresh_token
      if (typeof rotated !== 'string' || rotated.length === 0) {
        return
      }
      void this.persistRotatedToken(rotated)
    })
  }

  isAuthenticated(): boolean {
    const credentials = this.client.credentials
    return typeof credentials.refresh_token === 'string' && credentials.refresh_token.length > 0
  }

  canListCalendars(): boolean {
    return hasCalendarListScope(this.grantedScopes)
  }

  async listCalendars(): Promise<CalendarSummary[]> {
    if (!this.canListCalendars()) {
      return [{ id: 'primary', title: 'Primary calendar', primary: true }]
    }

    try {
      const response = await this.api.calendarList.list({ maxResults: 250, showHidden: false })
      const items = response.data.items ?? []
      return items
        .filter(
          (entry): entry is calendar_v3.Schema$CalendarListEntry => typeof entry.id === 'string',
        )
        .map((entry) => ({
          id: entry.id as string,
          title: entry.summaryOverride ?? entry.summary ?? (entry.id as string),
          primary: entry.primary === true,
        }))
    } catch (error) {
      throw mapGoogleError(error, this.accountId)
    }
  }

  async fetchEvents(
    calendarIds: readonly CalendarId[],
    range: TimeRange,
  ): Promise<CalendarEvent[]> {
    const targets = calendarIds.length > 0 ? calendarIds : ['primary']
    const requests = targets.map((calendarId) => this.fetchOneCalendar(calendarId, range))
    const results = await Promise.all(requests)
    return results.flat()
  }

  async disconnect(): Promise<void> {
    const refreshToken = this.client.credentials.refresh_token
    if (typeof refreshToken === 'string' && refreshToken.length > 0) {
      // Revoking with Google matters more than a clean local state (§8.2).
      try {
        await this.client.revokeToken(refreshToken)
      } catch (error) {
        this.logger.warn('google token revoke failed; deleting locally anyway', {
          error: describeError(error),
        })
      }
    }
    await this.vault.delete(this.accountId)
  }

  private async fetchOneCalendar(
    calendarId: CalendarId,
    range: TimeRange,
  ): Promise<CalendarEvent[]> {
    try {
      const response = await this.api.events.list({
        calendarId,
        timeMin: range.start,
        timeMax: range.end,
        // Expand recurring events into instances.
        singleEvents: true,
        orderBy: 'startTime',
        showDeleted: false,
        maxResults: MAX_EVENTS_PER_CALENDAR,
        eventTypes: EVENT_TYPES,
      })

      const items = response.data.items ?? []
      return mapGoogleEvents(items, { accountId: this.accountId, calendarId })
    } catch (error) {
      throw mapGoogleError(error, this.accountId)
    }
  }

  private async persistRotatedToken(refreshToken: string): Promise<void> {
    try {
      await this.vault.write(this.accountId, {
        refreshToken,
        grantedScopes: this.grantedScopes,
        obtainedAt: new Date().toISOString(),
      })
    } catch (error) {
      this.logger.error('could not persist rotated refresh token', {
        error: describeError(error),
      })
    }
  }
}
