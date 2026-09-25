import type { JSX } from 'react'

export function Spinner(): JSX.Element {
  return (
    <span
      role="status"
      aria-label="Loading"
      className="size-4 animate-spin rounded-full border-2 border-border border-t-accent"
    />
  )
}
