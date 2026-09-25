import type { AccountColour, AccountView } from '../../shared/types/account.ts'
import type { AccountId, CalendarId, CalendarSummary } from '../../shared/types/calendar.ts'
import type { AgendaService } from '../agenda/AgendaService.ts'
import { describeError } from '../infra/errors.ts'
import type { AppLogger } from '../infra/logger.ts'
import type { SettingsStore } from '../storage/SettingsStore.ts'
import type { TokenVault } from '../storage/TokenVault.ts'
import type { SyncScheduler } from '../sync/SyncScheduler.ts'
import type { ProviderFactory } from './ProviderFactory.ts'
import type { ProviderRegistry } from './ProviderRegistry.ts'

/**
 * Account lifecycle: connect, reconnect, disconnect, choose calendars
 * (docs/spec.md §3). IPC handlers delegate here and stay thin.
 */
export class AccountService {
  constructor(
    private readonly settings: SettingsStore,
    private readonly factory: ProviderFactory,
    private readonly registry: ProviderRegistry,
    private readonly agenda: AgendaService,
    private readonly vault: TokenVault,
    private readonly scheduler: SyncScheduler,
    private readonly logger: AppLogger,
  ) {}

  /** Rebuilds live providers for saved accounts at startup. */
  async restore(): Promise<void> {
    const accounts = this.settings.getAccounts()

    for (const account of accounts) {
      const provider = await this.factory.create(account)
      if (!provider) {
        // The credential is gone or this build has no OAuth client: show the
        // account, but make it clear it needs reconnecting (§7).
        this.agenda.setStatus(account.id, 'needsReauth')
        continue
      }
      this.registry.set(provider)
    }
  }

  /**
   * Phase 1 development: with no OAuth client built in there is nothing to
   * connect to, so the mock provider drives the whole UI instead (§9).
   */
  async addMockAccount(): Promise<void> {
    const settings = this.settings.addAccount({
      id: 'mock:demo',
      provider: 'mock',
      label: 'Demo calendar',
      calendarIds: ['primary'],
    })

    const account = settings.accounts.find((candidate) => candidate.id === 'mock:demo')
    if (!account) {
      return
    }

    const provider = await this.factory.create(account)
    if (provider) {
      this.registry.set(provider)
      this.agenda.setStatus(account.id, 'ready')
    }
  }

  list(): AccountView[] {
    return this.settings.getAccounts().map((account) => {
      const provider = this.registry.get(account.id)
      return {
        id: account.id,
        provider: account.provider,
        label: account.label,
        colour: account.colour,
        status: this.agenda.getStatus(account.id),
        calendarIds: account.calendarIds,
        lastSyncedAt: this.agenda.getLastSyncedAt(account.id),
        canListCalendars: provider?.canListCalendars() ?? false,
      }
    })
  }

  canConnect(): boolean {
    return this.factory.canConnect('google')
  }

  async connect(): Promise<AccountView[]> {
    const authenticator = this.factory.createAuthenticator('google')
    const result = await authenticator.authenticate()
    const accountId = result.identity.providerAccountId

    this.settings.addAccount({
      id: accountId,
      provider: 'google',
      label: result.identity.label,
      calendarIds: result.defaultCalendarIds,
    })

    const account = this.settings.findAccount(accountId)
    if (account) {
      const provider = await this.factory.create(account)
      if (provider) {
        this.registry.set(provider)
      }
    }

    this.agenda.setStatus(accountId, 'ready')
    this.scheduler.reconcile()
    void this.scheduler.syncNow(accountId)

    return this.list()
  }

  /** Re-running consent for an existing account; a fresh grant replaces the dead one. */
  async reconnect(accountId: AccountId): Promise<AccountView[]> {
    this.registry.forget(accountId)
    return await this.connect()
  }

  async disconnect(accountId: AccountId): Promise<AccountView[]> {
    // Revoke with the vendor first, then remove locally, and remove locally
    // even if revoking failed (§8.2).
    await this.registry.disconnect(accountId)

    try {
      await this.vault.delete(accountId)
    } catch (error) {
      this.logger.warn('could not delete stored credential', { error: describeError(error) })
    }

    this.settings.removeAccount(accountId)
    this.agenda.forget(accountId)
    this.scheduler.reconcile()
    return this.list()
  }

  update(accountId: AccountId, patch: { label?: string; colour?: AccountColour }): AccountView[] {
    this.settings.updateAccount(accountId, patch)
    this.agenda.refresh()
    return this.list()
  }

  async listCalendars(accountId: AccountId): Promise<CalendarSummary[]> {
    const provider = this.registry.get(accountId)
    if (!provider) {
      return []
    }
    return await provider.listCalendars()
  }

  async setCalendars(
    accountId: AccountId,
    calendarIds: readonly CalendarId[],
  ): Promise<AccountView[]> {
    this.settings.setSelectedCalendars(accountId, calendarIds)
    await this.scheduler.syncNow(accountId)
    return this.list()
  }
}
