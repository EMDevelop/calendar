/**
 * Every IPC channel in the app (docs/spec.md §8.5). Adding one means adding a
 * schema in contract.ts and a sender check in the router.
 */

export const CHANNELS = {
  agendaSnapshot: 'agenda:snapshot',
  agendaJoin: 'agenda:join',
  widgetHide: 'widget:hide',
  widgetSetPinned: 'widget:setPinned',
  settingsOpen: 'settings:open',
  accountsList: 'accounts:list',
  accountsConnect: 'accounts:connect',
  accountsReconnect: 'accounts:reconnect',
  accountsDisconnect: 'accounts:disconnect',
  accountsUpdate: 'accounts:update',
  calendarsList: 'calendars:list',
  calendarsSetSelected: 'calendars:setSelected',
  displaysList: 'displays:list',
  widgetMoveToDisplay: 'widget:moveToDisplay',
  settingsGet: 'settings:get',
  settingsUpdate: 'settings:update',
  syncNow: 'sync:now',
  alertShow: 'alert:show',
  alertJoin: 'alert:join',
  alertDismiss: 'alert:dismiss',
  alertTest: 'alert:test',
} as const

export type ChannelName = (typeof CHANNELS)[keyof typeof CHANNELS]

/** Which renderer a channel may be invoked from. */
export type WindowRole = 'widget' | 'settings' | 'alert'

export const CHANNEL_CALLERS: Record<ChannelName, readonly WindowRole[]> = {
  [CHANNELS.agendaSnapshot]: ['widget'],
  [CHANNELS.agendaJoin]: ['widget'],
  [CHANNELS.widgetHide]: ['widget'],
  [CHANNELS.widgetSetPinned]: ['widget'],
  [CHANNELS.settingsOpen]: ['widget'],
  [CHANNELS.accountsList]: ['settings'],
  [CHANNELS.accountsConnect]: ['settings'],
  [CHANNELS.accountsReconnect]: ['settings'],
  [CHANNELS.accountsDisconnect]: ['settings'],
  [CHANNELS.accountsUpdate]: ['settings'],
  [CHANNELS.calendarsList]: ['settings'],
  [CHANNELS.calendarsSetSelected]: ['settings'],
  [CHANNELS.displaysList]: ['settings'],
  [CHANNELS.widgetMoveToDisplay]: ['settings'],
  [CHANNELS.settingsGet]: ['settings'],
  [CHANNELS.settingsUpdate]: ['settings'],
  [CHANNELS.syncNow]: ['settings'],
  [CHANNELS.alertShow]: ['alert'],
  [CHANNELS.alertJoin]: ['alert'],
  [CHANNELS.alertDismiss]: ['alert'],
  [CHANNELS.alertTest]: ['settings'],
}

/**
 * Channels main pushes to a renderer. They carry no inbound payload, so they
 * have no request schema.
 */
export const PUSH_CHANNELS: readonly ChannelName[] = [CHANNELS.agendaSnapshot, CHANNELS.alertShow]

/** Channels whose side effects are rate-limited in main (§8.5). */
export const RATE_LIMITED_CHANNELS: readonly ChannelName[] = [
  CHANNELS.agendaJoin,
  CHANNELS.alertJoin,
  CHANNELS.syncNow,
  CHANNELS.accountsConnect,
  CHANNELS.accountsReconnect,
  CHANNELS.alertTest,
]

export const RATE_LIMIT_WINDOW_MS = 1_000
