import { useEffect, useState, type JSX } from 'react'
import type { CalendarSummary } from '../../../shared/types/calendar.ts'
import { Spinner } from '../../common/components/ui/Spinner.tsx'
import type { AccountsState } from '../../common/hooks/useAccounts.ts'
import { fetchCalendars } from '../../common/lib/ipcClient.ts'

interface CalendarPickerViewProps {
  readonly state: AccountsState
}

/** Which calendars inside each account appear in the widget (docs/spec.md §3). */
export function CalendarPickerView({ state }: CalendarPickerViewProps): JSX.Element {
  const [calendars, setCalendars] = useState<Record<string, CalendarSummary[]>>({})

  const accountIds = state.accounts
    .filter((account) => account.canListCalendars)
    .map((account) => account.id)
  const accountKey = accountIds.join(',')

  // Derived rather than stored, so nothing sets state during the effect body.
  const loading = accountIds.some((id) => !(id in calendars))

  useEffect(() => {
    let active = true

    const loadAll = async (): Promise<Record<string, CalendarSummary[]>> => {
      const entries = await Promise.all(
        accountIds.map(async (id) => [id, await fetchCalendars(id)] as const),
      )
      return Object.fromEntries(entries)
    }

    loadAll()
      .then((next) => {
        if (active) {
          setCalendars(next)
        }
      })
      .catch(() => {
        // Leaves the picker empty; the accounts tab surfaces connection errors.
      })

    return () => {
      active = false
    }
    // accountKey stands in for the account list, which is rebuilt on each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountKey])

  const toggle = (accountId: string, calendarId: string, selected: readonly string[]): void => {
    const next = selected.includes(calendarId)
      ? selected.filter((id) => id !== calendarId)
      : [...selected, calendarId]
    void state.setCalendars(accountId, next)
  }

  if (state.accounts.length === 0) {
    return <p className="text-sm text-text-muted">Connect an account first.</p>
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-base font-medium">Calendars {loading && <Spinner />}</h2>

      {state.accounts.map((account) => (
        <div key={account.id} className="flex flex-col gap-2">
          <h3 className="text-sm font-medium">{account.label}</h3>

          {!account.canListCalendars ? (
            <p className="text-xs text-text-muted">
              This account was connected without permission to list calendars, so only the primary
              calendar is shown.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {(calendars[account.id] ?? []).map((calendar) => (
                <li key={calendar.id}>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={account.calendarIds.includes(calendar.id)}
                      disabled={state.busy}
                      onChange={() => {
                        toggle(account.id, calendar.id, account.calendarIds)
                      }}
                    />
                    <span className="truncate">{calendar.title}</span>
                    {calendar.primary && <span className="text-xs text-text-muted">(primary)</span>}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </section>
  )
}
