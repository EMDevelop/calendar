/**
 * A tiny typed publish/subscribe primitive.
 *
 * Producers (AgendaService, SystemEvents) expose a Signal; consumers subscribe.
 * That is what keeps dependencies pointing one way and lets main stay unaware
 * of IPC (docs/spec.md §5).
 */
export class Signal<T> {
  private readonly listeners = new Set<(value: T) => void>()

  subscribe(listener: (value: T) => void): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  emit(value: T): void {
    for (const listener of [...this.listeners]) {
      listener(value)
    }
  }

  clear(): void {
    this.listeners.clear()
  }
}
