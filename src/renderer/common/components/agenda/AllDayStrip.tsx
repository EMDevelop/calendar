import type { JSX } from 'react'
import type { AgendaItem } from '../../../../shared/types/agenda.ts'
import { COLOUR_DOT } from '../../lib/accountColours.ts'

interface AllDayStripProps {
  readonly items: readonly AgendaItem[]
}

/**
 * Context, not urgency: all-day events sit above the timeline and never get a
 * countdown or a notification (docs/spec.md §6).
 */
export function AllDayStrip({ items }: AllDayStripProps): JSX.Element | null {
  if (items.length === 0) {
    return null
  }

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 border-b border-border bg-bg-subtle px-3 py-1.5">
      {items.map((item) => (
        <span key={item.id} className="flex min-w-0 items-center gap-1.5 text-xs text-text-muted">
          <span className={`size-1.5 shrink-0 rounded-full ${COLOUR_DOT[item.colour]}`} />
          <span className="truncate">{item.title}</span>
        </span>
      ))}
    </div>
  )
}
