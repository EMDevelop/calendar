import type { JSX } from 'react'
import { formatClockTime, formatDayLabel } from '../../lib/formatTime.ts'

interface TitleBarProps {
  readonly pinned: boolean
  readonly privacyMode: boolean
  readonly nowIso: string
  readonly onTogglePin: () => void
  readonly onHide: () => void
  readonly onOpenSettings: () => void
}

/**
 * Drag region plus the two controls the widget needs (docs/spec.md §6).
 * "Minimise" hides to the menu bar: there is no Dock icon to fall into.
 */
export function TitleBar({
  pinned,
  privacyMode,
  nowIso,
  onTogglePin,
  onHide,
  onOpenSettings,
}: TitleBarProps): JSX.Element {
  return (
    <header className="drag-region flex items-center gap-2 border-b border-border px-3 py-1.5">
      {/* The clock anchors the timeline below it (§6). */}
      <span className="tabular shrink-0 font-mono text-[13px] font-medium">
        {formatClockTime(nowIso)}
      </span>
      <span className="flex-1 truncate text-[11px] text-text-muted">
        {formatDayLabel(nowIso)}
        {privacyMode ? ' · private' : ''}
      </span>

      <TitleBarButton
        label={pinned ? 'Unpin' : 'Pin'}
        title={pinned ? 'Stop floating on top' : 'Float on top'}
        active={pinned}
        onClick={onTogglePin}
      />
      <TitleBarButton label="Settings" title="Open settings" onClick={onOpenSettings} />
      <TitleBarButton label="Hide" title="Hide to the menu bar" onClick={onHide} />
    </header>
  )
}

interface TitleBarButtonProps {
  readonly label: string
  readonly title: string
  readonly active?: boolean
  readonly onClick: () => void
}

function TitleBarButton({ label, title, active, onClick }: TitleBarButtonProps): JSX.Element {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      // Buttons must opt out of the drag region or they cannot be clicked (§10).
      className={`no-drag rounded px-1.5 py-0.5 text-[11px] hover:bg-bg-subtle ${
        active ? 'text-accent' : 'text-text-muted'
      }`}
    >
      {label}
    </button>
  )
}
