import type { JSX } from 'react'

interface EmptyStateProps {
  readonly message: string
}

/** Centred muted line, generous whitespace (docs/spec.md §6). */
export function EmptyState({ message }: EmptyStateProps): JSX.Element {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-10 text-center text-text-muted">
      {message}
    </div>
  )
}
