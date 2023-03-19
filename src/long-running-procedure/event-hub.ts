import { Emitter } from '@blackglory/structures'
import { waitForEmitter } from '@blackglory/wait-for'

export enum Event {
  Settled
, Removed
}

type EventToArgs = {
  [Event.Settled]: []
  [Event.Removed]: []
}

export class EventHub {
  private idToEmitter: Map<string, Emitter<EventToArgs>> = new Map()

  async waitFor(
    id: string
  , event: keyof EventToArgs
  , abortSignal?: AbortSignal
  ): Promise<void> {
    if (!this.idToEmitter.has(id)) {
      this.idToEmitter.set(id, new Emitter())
    }

    const emitter = this.idToEmitter.get(id)!
    await waitForEmitter(emitter, event, abortSignal)
  }

  on<T extends Event>(
    id: string
  , event: T
  , listener: (...args: EventToArgs[T]) => void
  ): () => void {
    if (!this.idToEmitter.has(id)) {
      this.idToEmitter.set(id, new Emitter())
    }

    const emitter = this.idToEmitter.get(id)!
    return emitter.on(event, listener)
  }

  once<T extends Event>(
    id: string
  , event: T
  , listener: (...args: EventToArgs[T]) => void
  ): () => void {
    if (!this.idToEmitter.has(id)) {
      this.idToEmitter.set(id, new Emitter())
    }

    const emitter = this.idToEmitter.get(id)!
    return emitter.once(event, listener)
  }

  emit<T extends Event>(
    id: string
  , event: T
  , ...args: EventToArgs[T]
  ): void {
    this.idToEmitter.get(id)?.emit(event, ...args)
  }

  removeAllListeners(id: string): void {
    const emitter = this.idToEmitter.get(id)
    if (emitter) {
      emitter.removeAllListeners(Event.Settled)
    }
  }
}
