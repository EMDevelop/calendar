import type { AccountConfig } from './account.ts'

export type ViewMode = 'merged' | 'split'
export type ThemeSource = 'system' | 'light' | 'dark'
export type WidgetCorner = 'topRight' | 'topLeft' | 'bottomRight' | 'bottomLeft' | 'remembered'

/**
 * Displays are matched by label and size first, because macOS display ids change
 * across reconnects (§10).
 */
export interface DisplayKey {
  readonly id: number
  readonly label: string
  readonly width: number
  readonly height: number
}

export interface WidgetPlacement {
  readonly display: DisplayKey | null
  readonly corner: WidgetCorner
  readonly bounds: { x: number; y: number; width: number; height: number } | null
}

export interface AppSettings {
  readonly viewMode: ViewMode
  readonly theme: ThemeSource
  readonly syncIntervalMinutes: number
  /** Null disables meeting notifications. */
  readonly notificationLeadMinutes: number | null
  readonly hideTitlesInMenuBar: boolean
  readonly privacyMode: boolean
  readonly launchAtLogin: boolean
  readonly alwaysOnTop: boolean
  readonly placement: WidgetPlacement
  readonly accounts: readonly AccountConfig[]
}

export interface DisplayOption {
  readonly key: DisplayKey
  readonly isPrimary: boolean
  readonly isCurrent: boolean
}
