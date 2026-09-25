import type { JSX } from 'react'
import type { AgendaSnapshot } from '../../../shared/types/agenda.ts'
import { AgendaColumn } from '../../common/components/agenda/AgendaColumn.tsx'

interface SplitViewProps {
  readonly snapshot: AgendaSnapshot
  readonly onJoin: (eventId: string) => void
}

/** One column per account — the same component the merged view uses (§4). */
export function SplitView({ snapshot, onJoin }: SplitViewProps): JSX.Element {
  return (
    <div className="flex flex-1 divide-x divide-border overflow-hidden">
      {snapshot.accounts.map((account) => (
        <AgendaColumn
          key={account.id}
          header={{ label: account.label, colour: account.colour }}
          items={snapshot.timed.filter((item) => item.accountId === account.id)}
          onJoin={onJoin}
          emptyMessage="Nothing left"
        />
      ))}
    </div>
  )
}
