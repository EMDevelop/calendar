import type { JSX } from 'react'
import {
  MAX_NOTIFICATION_LEAD_MINUTES,
  MAX_SYNC_INTERVAL_MINUTES,
  MIN_SYNC_INTERVAL_MINUTES,
} from '../../../shared/constants.ts'
import type { ThemeSource, ViewMode } from '../../../shared/types/settings.ts'
import type { SettingsState } from '../../common/hooks/useSettings.ts'
import { settingsApi } from '../../common/lib/ipcClient.ts'

interface PreferencesViewProps {
  readonly state: SettingsState
}

export function PreferencesView({ state }: PreferencesViewProps): JSX.Element {
  const settings = state.settings
  if (!settings) {
    return <p className="text-sm text-text-muted">Loading…</p>
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-base font-medium">Preferences</h2>
      {state.error && <p className="text-xs text-urgent">{state.error}</p>}

      <Row label="View">
        <select
          value={settings.viewMode}
          onChange={(event) => {
            void state.update({ viewMode: event.target.value as ViewMode })
          }}
          className="rounded border border-border bg-bg px-2 py-1 text-sm"
        >
          <option value="merged">Merged</option>
          <option value="split">Split by account</option>
        </select>
      </Row>

      <Row label="Theme">
        <select
          value={settings.theme}
          onChange={(event) => {
            void state.update({ theme: event.target.value as ThemeSource })
          }}
          className="rounded border border-border bg-bg px-2 py-1 text-sm"
        >
          <option value="system">Follow macOS</option>
          <option value="light">Light</option>
          <option value="dark">Dark</option>
        </select>
      </Row>

      <Row label="Refresh every" hint="A shorter interval catches meetings added at short notice.">
        <input
          type="number"
          min={MIN_SYNC_INTERVAL_MINUTES}
          max={MAX_SYNC_INTERVAL_MINUTES}
          value={settings.syncIntervalMinutes}
          onChange={(event) => {
            void state.update({ syncIntervalMinutes: Number(event.target.value) })
          }}
          className="w-20 rounded border border-border bg-bg px-2 py-1 text-sm"
        />
      </Row>

      <Row label="Notify before" hint="Set to off to stop meeting notifications.">
        <select
          value={settings.notificationLeadMinutes ?? 'off'}
          onChange={(event) => {
            const value = event.target.value
            void state.update({
              notificationLeadMinutes: value === 'off' ? null : Number(value),
            })
          }}
          className="rounded border border-border bg-bg px-2 py-1 text-sm"
        >
          <option value="off">Off</option>
          {Array.from({ length: MAX_NOTIFICATION_LEAD_MINUTES + 1 }, (_unused, minutes) => (
            <option key={minutes} value={minutes}>
              {minutes === 0 ? 'At start' : `${minutes} min`}
            </option>
          ))}
        </select>
      </Row>

      <Toggle
        label="Privacy mode"
        hint="Replaces meeting titles with “Busy” everywhere. Turn this on before screen sharing."
        checked={settings.privacyMode}
        onChange={(checked) => void state.update({ privacyMode: checked })}
      />

      <Toggle
        label="Hide titles in the menu bar"
        hint="Shows only the countdown next to the menu-bar icon."
        checked={settings.hideTitlesInMenuBar}
        onChange={(checked) => void state.update({ hideTitlesInMenuBar: checked })}
      />

      <Toggle
        label="Float on top"
        checked={settings.alwaysOnTop}
        onChange={(checked) => void state.update({ alwaysOnTop: checked })}
      />

      <Toggle
        label="Launch at login"
        checked={settings.launchAtLogin}
        onChange={(checked) => void state.update({ launchAtLogin: checked })}
      />

      <button
        type="button"
        onClick={() => void settingsApi().syncNow()}
        className="self-start rounded border border-border px-3 py-1 text-xs text-accent hover:bg-accent/10"
      >
        Sync now
      </button>
    </section>
  )
}

interface RowProps {
  readonly label: string
  readonly hint?: string
  readonly children: JSX.Element
}

function Row({ label, hint, children }: RowProps): JSX.Element {
  return (
    <label className="flex items-start gap-3">
      <span className="w-40 shrink-0 pt-1 text-sm">{label}</span>
      <span className="flex flex-col gap-1">
        {children}
        {hint && <span className="text-xs text-text-muted">{hint}</span>}
      </span>
    </label>
  )
}

interface ToggleProps {
  readonly label: string
  readonly hint?: string
  readonly checked: boolean
  readonly onChange: (checked: boolean) => void
}

function Toggle({ label, hint, checked, onChange }: ToggleProps): JSX.Element {
  return (
    <label className="flex items-start gap-3">
      <span className="w-40 shrink-0 text-sm">{label}</span>
      <span className="flex flex-col gap-1">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => {
            onChange(event.target.checked)
          }}
        />
        {hint && <span className="text-xs text-text-muted">{hint}</span>}
      </span>
    </label>
  )
}
