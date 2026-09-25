import { useCallback, useEffect, useState, type JSX } from 'react'
import type { DisplayOption, WidgetCorner } from '../../../shared/types/settings.ts'
import { fetchDisplays, settingsApi } from '../../common/lib/ipcClient.ts'

const CORNERS: readonly { value: WidgetCorner; label: string }[] = [
  { value: 'topRight', label: 'Top right' },
  { value: 'topLeft', label: 'Top left' },
  { value: 'bottomRight', label: 'Bottom right' },
  { value: 'bottomLeft', label: 'Bottom left' },
  { value: 'remembered', label: 'Where I left it' },
]

/** Choose the monitor and corner the widget lives on (docs/spec.md §6). */
export function DisplayView(): JSX.Element {
  const [displays, setDisplays] = useState<readonly DisplayOption[]>([])
  const [corner, setCorner] = useState<WidgetCorner>('topRight')
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const next = await fetchDisplays()
    setDisplays(next)
  }, [])

  useEffect(() => {
    let active = true
    fetchDisplays()
      .then((next) => {
        if (active) {
          setDisplays(next)
        }
      })
      .catch(() => {
        if (active) {
          setError('Could not read the connected displays.')
        }
      })
    return () => {
      active = false
    }
  }, [])

  const move = (option: DisplayOption): void => {
    void settingsApi()
      .moveToDisplay({ display: option.key, corner })
      .then(reload)
      .catch(() => {
        setError('Could not move the widget to that display.')
      })
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-base font-medium">Display</h2>
      {error && <p className="text-xs text-urgent">{error}</p>}

      <label className="flex items-center gap-2 text-sm">
        Position
        <select
          value={corner}
          onChange={(event) => {
            setCorner(event.target.value as WidgetCorner)
          }}
          className="rounded border border-border bg-bg px-2 py-1 text-sm"
        >
          {CORNERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <ul className="flex flex-col gap-2">
        {displays.map((option) => (
          <li
            key={`${option.key.id}:${option.key.label}`}
            className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {option.key.label}
                {option.isPrimary ? ' (main)' : ''}
              </p>
              <p className="text-xs text-text-muted">
                {option.key.width} × {option.key.height}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                move(option)
              }}
              disabled={option.isCurrent}
              className="rounded border border-border px-2 py-1 text-xs text-accent hover:bg-accent/10 disabled:opacity-50"
            >
              {option.isCurrent ? 'Current' : 'Move here'}
            </button>
          </li>
        ))}
      </ul>

      <p className="text-xs text-text-muted">
        If this monitor is disconnected the widget moves to the main display, and returns when the
        monitor is back.
      </p>
    </section>
  )
}
