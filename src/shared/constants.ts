/** Values shared by both processes. Pure data only — see docs/spec.md §4. */

export const ACCOUNT_COLOURS = ['sky', 'violet', 'amber', 'emerald', 'rose'] as const

/** An event is "imminent" this many minutes before it starts (§6). */
export const IMMINENT_THRESHOLD_MINUTES = 15

export const DEFAULT_SYNC_INTERVAL_MINUTES = 3
export const MIN_SYNC_INTERVAL_MINUTES = 1
export const MAX_SYNC_INTERVAL_MINUTES = 15

export const DEFAULT_NOTIFICATION_LEAD_MINUTES = 1
export const MAX_NOTIFICATION_LEAD_MINUTES = 15

/** The timeline's default span; it widens for events outside it (§6). */
export const DEFAULT_DAY_START_HOUR = 7
export const DEFAULT_DAY_END_HOUR = 22

/** Below this width, split view collapses to merged (§6). */
export const SPLIT_VIEW_MIN_WIDTH = 520

/** Hostile invites control this text, so it is bounded before use (§8.1). */
export const MAX_EVENT_TITLE_LENGTH = 200

/** Shown instead of a real title while privacy mode is on (§6). */
export const PRIVACY_PLACEHOLDER_TITLE = 'Busy'

/** The notch hides long menu-bar titles (§6). */
export const TRAY_TITLE_MAX_LENGTH = 16

export const WIDGET_MIN_WIDTH = 260
export const WIDGET_MIN_HEIGHT = 200
export const WIDGET_DEFAULT_WIDTH = 320
export const WIDGET_DEFAULT_HEIGHT = 420
export const WIDGET_SCREEN_MARGIN = 16

export const SETTINGS_WINDOW_WIDTH = 720
export const SETTINGS_WINDOW_HEIGHT = 560
