import type { JSX } from 'react'
import type { AgendaSnapshot } from '../../../shared/types/agenda.ts'
import { DayTimeline } from '../../common/components/agenda/DayTimeline.tsx'
import { windowOf } from '../timelineWindow.ts'

interface SplitViewProps {
  readonly snapshot: AgendaSnapshot
  readonly onJoin: (eventId: string) => void
}

/**
 * One column per account on a shared time axis, so the same hour lines up
 * across accounts (§6).
 */
export function SplitView({ snapshot, onJoin }: SplitViewProps): JSX.Element {
  return (
    <DayTimeline
      window={windowOf(snapshot)}
      nowIso={snapshot.now}
      lanes={snapshot.accounts.map((account) => ({
        key: account.id,
        label: account.label,
        colour: account.colour,
        items: snapshot.timed.filter((item) => item.accountId === account.id),
      }))}
      onJoin={onJoin}
    />
  )
}
