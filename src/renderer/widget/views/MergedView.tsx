import type { JSX } from 'react'
import type { AgendaSnapshot } from '../../../shared/types/agenda.ts'
import { AgendaColumn } from '../../common/components/agenda/AgendaColumn.tsx'

interface MergedViewProps {
  readonly snapshot: AgendaSnapshot
  readonly onJoin: (eventId: string) => void
}

/** All accounts in one stream, already deduped in main (docs/spec.md §7). */
export function MergedView({ snapshot, onJoin }: MergedViewProps): JSX.Element {
  return <AgendaColumn items={snapshot.timed} onJoin={onJoin} />
}
