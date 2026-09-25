import type { AccountId } from '../../shared/types/calendar.ts'
import type { AppLogger } from '../infra/logger.ts'
import { describeError } from '../infra/errors.ts'
import type { CalendarProvider } from './CalendarProvider.ts'

/**
 * Live provider instances, one per connected account (docs/spec.md §3).
 * Two accounts side by side is iterating this map, not a special case.
 */
export class ProviderRegistry {
  private readonly providers = new Map<AccountId, CalendarProvider>()

  constructor(private readonly logger: AppLogger) {}

  set(provider: CalendarProvider): void {
    this.providers.set(provider.accountId, provider)
  }

  get(accountId: AccountId): CalendarProvider | null {
    return this.providers.get(accountId) ?? null
  }

  has(accountId: AccountId): boolean {
    return this.providers.has(accountId)
  }

  list(): readonly CalendarProvider[] {
    return [...this.providers.values()]
  }

  ids(): readonly AccountId[] {
    return [...this.providers.keys()]
  }

  /** Drops the instance without revoking; used when settings no longer list the account. */
  forget(accountId: AccountId): void {
    this.providers.delete(accountId)
  }

  async disconnect(accountId: AccountId): Promise<void> {
    const provider = this.providers.get(accountId)
    if (!provider) {
      return
    }
    this.providers.delete(accountId)

    // A failed revoke must not block local cleanup (§8.2).
    try {
      await provider.disconnect()
    } catch (error) {
      this.logger.warn('provider disconnect failed; local credentials still removed', {
        error: describeError(error),
      })
    }
  }
}
