import type { JSX } from 'react'

/** The "you are here" line: 1px accent rule with a dot (docs/spec.md §6). */
export function NowMarker(): JSX.Element {
  return (
    <div aria-hidden="true" className="flex items-center gap-1 py-1 pl-1">
      <span className="size-1.5 rounded-full bg-accent" />
      <span className="h-px flex-1 bg-accent" />
    </div>
  )
}
