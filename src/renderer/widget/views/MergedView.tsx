import type { JSX } from 'react'
import type { AgendaSnapshot } from '../../../shared/types/agenda.ts'
import { DayTimeline } from '../../common/components/agenda/DayTimeline.tsx'
import { windowOf } from '../timelineWindow.ts'

interface MergedViewProps {
  readonly snapshot: AgendaSnapshot
  readonly onJoin: (eventId: string) => void
}

/** All accounts on one timeline, already deduped in main (docs/spec.md §7). */
export function MergedView({ snapshot, onJoin }: MergedViewProps): JSX.Element {
  return (
    <DayTimeline
      window={windowOf(snapshot)}
      nowIso={snapshot.now}
      lanes={[{ key: 'merged', items: snapshot.timed }]}
      secondaryTimeZone={snapshot.secondaryTimeZone}
      onJoin={onJoin}
    />
  )
}
