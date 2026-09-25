import type { JSX } from 'react'
import type { AgendaItem } from '../../../../shared/types/agenda.ts'
import { COLOUR_DOT } from '../../lib/accountColours.ts'
import { formatDuration } from '../../lib/formatTime.ts'

interface NextUpBarProps {
  readonly nextUp: AgendaItem | null
  readonly onJoin: (eventId: string) => void
}

/**
 * The countdown in words (docs/spec.md §6).
 *
 * The timeline shows roughly a quarter of an hour per ten pixels, so "two
 * minutes before" and "just started" are visually identical. The distinction
 * matters, so it is stated rather than drawn.
 */
export function NextUpBar({ nextUp, onJoin }: NextUpBarProps): JSX.Element | null {
  if (!nextUp) {
    return null
  }

  const live = nextUp.status === 'live'
  const timing = live
    ? `in progress · ${formatDuration(nextUp.minutesRemaining)} left`
    : nextUp.startsInMinutes <= 0
      ? 'starting now'
      : `in ${formatDuration(nextUp.startsInMinutes)}`

  const tone = live ? 'text-live' : nextUp.status === 'imminent' ? 'text-urgent' : 'text-text-muted'

  return (
    <div className="flex items-center gap-2 border-b border-border px-3 py-1">
      <span className={`size-1.5 shrink-0 rounded-full ${COLOUR_DOT[nextUp.colour]}`} />
      <span className="min-w-0 flex-1 truncate text-[11px] font-medium" title={nextUp.title}>
        {nextUp.title}
      </span>
      <span className={`tabular shrink-0 font-mono text-[11px] ${tone}`}>{timing}</span>
      {nextUp.canJoin && (
        <button
          type="button"
          onClick={() => {
            onJoin(nextUp.id)
          }}
          className="no-drag shrink-0 rounded border border-border px-1.5 text-[10px] text-accent hover:bg-accent/10"
        >
          Join
        </button>
      )}
    </div>
  )
}
