import { assert } from '@blackglory/prelude'
import { Emitter } from '@blackglory/structures'
import { waitForEmitter } from '@blackglory/wait-for'
import { enumValues } from 'extra-utils'

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

  has(id: string): boolean {
    return this.idToEmitter.has(id)
  }

  register(id: string): void {
    assert(!this.idToEmitter.has(id), 'The emitter already exists')

    this.idToEmitter.set(id, new Emitter())
  }

  unregister(id: string): void {
    const emitter = this.idToEmitter.get(id)
    assert(emitter, 'The emitter does not exists')

    for (const event of enumValues(Event)) {
      emitter.removeAllListeners(event)
    }

    this.idToEmitter.delete(id)
  }

  async waitFor(
    id: string
  , event: keyof EventToArgs
  , abortSignal?: AbortSignal
  ): Promise<void> {
    const emitter = this.idToEmitter.get(id)
    assert(emitter, 'The emitter does not exist')

    await waitForEmitter(emitter, event, abortSignal)
  }

  on<T extends Event>(
    id: string
  , event: T
  , listener: (...args: EventToArgs[T]) => void
  ): () => void {
    const emitter = this.idToEmitter.get(id)
    assert(emitter, 'The emitter does not exist')

    return emitter.on(event, listener)
  }

  once<T extends Event>(
    id: string
  , event: T
  , listener: (...args: EventToArgs[T]) => void
  ): () => void {
    const emitter = this.idToEmitter.get(id)
    assert(emitter, 'The emitter does not exist')

    return emitter.once(event, listener)
  }

  emit<T extends Event>(
    id: string
  , event: T
  , ...args: EventToArgs[T]
  ): void {
    const emitter = this.idToEmitter.get(id)
    assert(emitter, 'The emitter does not exist')

    emitter.emit(event, ...args)
  }
}
