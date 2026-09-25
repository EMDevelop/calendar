import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { CHANNELS } from '../shared/ipc/channels.ts'
import type { WidgetBridge } from '../shared/ipc/bridge.ts'
import type { AgendaSnapshot } from '../shared/types/agenda.ts'

/**
 * The widget's entire surface (docs/spec.md §8.5).
 *
 * Hand-written and narrow: no generic invoke passthrough, and nothing here
 * can reach a channel the widget is not allowed on. Bundled to CommonJS
 * because sandboxed preloads cannot require at runtime (§10).
 */
const api: WidgetBridge = {
  onSnapshot(listener: (snapshot: AgendaSnapshot) => void): () => void {
    const subscription = (_event: IpcRendererEvent, snapshot: AgendaSnapshot): void => {
      listener(snapshot)
    }
    ipcRenderer.on(CHANNELS.agendaSnapshot, subscription)
    return () => {
      ipcRenderer.removeListener(CHANNELS.agendaSnapshot, subscription)
    }
  },

  async join(eventId: string): Promise<void> {
    await ipcRenderer.invoke(CHANNELS.agendaJoin, { eventId })
  },

  async hide(): Promise<void> {
    await ipcRenderer.invoke(CHANNELS.widgetHide)
  },

  async setPinned(pinned: boolean): Promise<void> {
    await ipcRenderer.invoke(CHANNELS.widgetSetPinned, { pinned })
  },

  async openSettings(): Promise<void> {
    await ipcRenderer.invoke(CHANNELS.settingsOpen)
  },
}

contextBridge.exposeInMainWorld('widgetApi', api)
