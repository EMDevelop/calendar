import { useEffect, useState } from 'react'
import type { AgendaSnapshot } from '../../../shared/types/agenda.ts'
import { onSnapshot } from '../lib/ipcClient.ts'

/**
 * Subscribes to main's snapshot pushes (docs/spec.md §7).
 *
 * There is no timer here: main owns the clock, so the widget re-renders when
 * the snapshot changes and never re-derives urgency itself.
 */
export function useAgenda(): AgendaSnapshot | null {
  const [snapshot, setSnapshot] = useState<AgendaSnapshot | null>(null)

  useEffect(() => {
    return onSnapshot(setSnapshot)
  }, [])

  return snapshot
}
