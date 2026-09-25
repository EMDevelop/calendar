import type { JSX } from 'react'
import type { AgendaAccount } from '../../../../shared/types/agenda.ts'
import { formatRelativeSync } from '../../lib/formatTime.ts'

interface StatusStripProps {
  readonly accounts: readonly AgendaAccount[]
  readonly nowIso: string
}

/**
 * Quiet by design (docs/spec.md §7): a failed sync changes this line, never
 * the agenda above it.
 */
export function StatusStrip({ accounts, nowIso }: StatusStripProps): JSX.Element | null {
  if (accounts.length === 0) {
    return null
  }

  const needsReauth = accounts.filter((account) => account.status === 'needsReauth')
  const offline = accounts.filter((account) => account.status === 'offline')

  const message = (() => {
    if (needsReauth.length > 0) {
      return `${needsReauth.map((account) => account.label).join(', ')} needs reconnecting`
    }
    if (offline.length > 0) {
      return 'Offline — showing last known events'
    }
    const lastSynced = accounts
      .map((account) => account.lastSyncedAt)
      .filter((value): value is string => value !== null)
      .sort()
      .at(-1)
    return formatRelativeSync(lastSynced ?? null, nowIso)
  })()

  const tone = needsReauth.length > 0 ? 'text-urgent' : 'text-text-muted'

  return (
    <footer className={`truncate border-t border-border px-3 py-1 text-[11px] ${tone}`}>
      {message}
    </footer>
  )
}
