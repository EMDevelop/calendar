import type { JSX } from 'react'
import type { AgendaItem } from '../../../../shared/types/agenda.ts'
import type { AccountColour } from '../../../../shared/types/account.ts'
import { COLOUR_HEADER } from '../../lib/accountColours.ts'
import { EmptyState } from './EmptyState.tsx'
import { EventRow } from './EventRow.tsx'
import { NowMarker } from './NowMarker.tsx'

interface AgendaColumnProps {
  readonly items: readonly AgendaItem[]
  readonly onJoin: (eventId: string) => void
  readonly header?: { label: string; colour: AccountColour }
  readonly emptyMessage?: string
}

/**
 * The reuse point (docs/spec.md §4): merged view renders one of these, split
 * view renders N. Same component, different props.
 */
export function AgendaColumn({
  items,
  onJoin,
  header,
  emptyMessage = 'Nothing left today',
}: AgendaColumnProps): JSX.Element {
  // The marker goes before the first event that has not finished.
  const markerIndex = items.findIndex((item) => item.status !== 'past')

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {header && (
        <div
          className={`truncate px-3 py-1 text-[11px] font-medium tracking-wide ${COLOUR_HEADER[header.colour]}`}
        >
          {header.label}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState message={emptyMessage} />
      ) : (
        <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-1 py-1">
          {items.map((item, index) => (
            <div key={item.id}>
              {index === markerIndex && <NowMarker />}
              <EventRow item={item} onJoin={onJoin} />
            </div>
          ))}
          {markerIndex === -1 && <NowMarker />}
        </div>
      )}
    </div>
  )
}
