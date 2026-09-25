import type { JSX } from 'react'
import type { AgendaItem } from '../../../../shared/types/agenda.ts'
import { COLOUR_BAR } from '../../lib/accountColours.ts'
import { formatClockTime, formatDuration } from '../../lib/formatTime.ts'

interface EventRowProps {
  readonly item: AgendaItem
  readonly onJoin: (eventId: string) => void
}

/** State treatment per docs/spec.md §6. */
const ROW_STATE: Record<AgendaItem['status'], string> = {
  past: 'opacity-45',
  live: 'bg-live/10',
  imminent: 'bg-urgent/10',
  upcoming: '',
}

const TIME_STATE: Record<AgendaItem['status'], string> = {
  past: 'text-text-muted',
  live: 'text-live',
  imminent: 'text-urgent',
  upcoming: 'text-text-muted',
}

export function EventRow({ item, onJoin }: EventRowProps): JSX.Element {
  // The left bar carries the account colour normally, and urgency when it matters.
  const barColour =
    item.status === 'imminent'
      ? 'bg-urgent'
      : item.status === 'live'
        ? 'bg-live'
        : COLOUR_BAR[item.colour]

  return (
    <div
      className={`group relative flex items-center gap-3 rounded-md py-2 pr-3 pl-3 ${ROW_STATE[item.status]}`}
    >
      {item.status !== 'past' && (
        <span
          aria-hidden="true"
          className={`absolute top-1 bottom-1 left-0 w-[3px] rounded-full ${barColour}`}
        />
      )}

      <time className={`tabular shrink-0 font-mono text-xs ${TIME_STATE[item.status]}`}>
        {formatClockTime(item.start)}
      </time>

      <span className="min-w-0 flex-1 truncate font-medium" title={item.title}>
        {item.title}
      </span>

      {item.status === 'live' && (
        <span className="tabular shrink-0 font-mono text-[11px] text-live">
          {formatDuration(item.minutesRemaining)} left
        </span>
      )}

      {item.canJoin && (
        <button
          type="button"
          onClick={() => {
            onJoin(item.id)
          }}
          // Always visible when it is nearly time, on hover otherwise (§6).
          className={`no-drag shrink-0 rounded border border-border px-2 py-0.5 text-[11px] text-accent transition-opacity hover:bg-accent/10 ${
            item.status === 'imminent' || item.status === 'live'
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
          }`}
        >
          Join
        </button>
      )}
    </div>
  )
}
