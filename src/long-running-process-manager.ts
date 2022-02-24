import { FiniteStateMachine } from '@blackglory/structures'
import { nanoid } from 'nanoid'
import { assert, normalize, SerializableError, CustomError } from '@blackglory/errors'
import { isError, isntUndefined } from '@blackglory/types'
import { Awaitable } from 'justypes'

export interface IStore<T> {
  set(key: string, value: T): Awaitable<void>
  get(key: string): Awaitable<T | null>
  delete(key: string): Awaitable<void>
}

export interface ILongRunningProcessManager<Args extends any[], Result> {
  startProcess(...args: Args): Awaitable<string>
  endProcess(id: string): Awaitable<null>
  getProcessState(id: string): Awaitable<'starting' | 'running' | 'done' | 'error'>
  getProcessResult(id: string): Awaitable<Result>
  getProcessError(id: string): Awaitable<SerializableError>
}

type State = 'starting' | 'running' | 'done' | 'error'
type Event = 'start' | 'started' | 'resolve' | 'reject'

export class LongRunningProcessManager<Args extends any[], Result> implements ILongRunningProcessManager<Args, Result> {
  private process: (...args: Args) => PromiseLike<Result>
  private store: IStore<Result | SerializableError>
  private processIdToFSM = new Map<string, FiniteStateMachine<State, Event> | undefined>()

  constructor(options: {
    process: (...args: Args) => PromiseLike<Result>
    store: IStore<Result>
  }) {
    this.process = options.process
    this.store = options.store
  }

  startProcess(...args: Args): string {
    const fsm = this.createFSM()
    const id = this.createId()
    this.processIdToFSM.set(id, fsm)

    queueMicrotask(async () => {
      fsm.send('started')
      try {
        const result = await this.process(...args)
        await this.store.set(id, result)
        fsm.send('resolve')
      } catch (e) {
        try {
          assert(isError(e), 'The thrown value is not an Error')
          await this.store.set(id, normalize(e))
        } catch (e) {
          await this.store.set(id, normalize(new InternalError(`${e}`)))
        } finally {
          fsm.send('reject')
        }
      }
    })

    return id
  }

  async endProcess(id: string): Promise<null> {
    const fsm = this.getFSM(id)

    if (fsm.matches('starting')) throw new Error('Cannot end the process that is idle')
    if (fsm.matches('running')) throw new Error('The process is still running')
    if (fsm.matches('done') || fsm.matches('error')) {
      await this.store.delete(id)
      this.processIdToFSM.delete(id)
      return null
    }

    throw new Error('Unknown state')
  }

  getProcessState(id: string): State {
    const fsm = this.getFSM(id)
    return fsm.state
  }

  async getProcessResult(id: string): Promise<Result> {
    const fsm = this.getFSM(id)

    if (fsm.matches('done')) {
      return await this.store.get(id) as Result
    } else {
      throw new Error(`Bad state: ${fsm.state}`)
    }
  }

  async getProcessError(id: string): Promise<SerializableError> {
    const fsm = this.getFSM(id)

    if (fsm.matches('error')) {
      return await this.store.get(id) as SerializableError
    } else {
      throw new Error(`Bad state: ${fsm.state}`)
    }
  }

  private getFSM(id: string): FiniteStateMachine<State, Event> {
    const fsm = this.processIdToFSM.get(id)
    assert(isntUndefined(fsm), `The process ${id} does not exist`)
    return fsm
  }

  private createFSM(): FiniteStateMachine<State, Event> {
    return new FiniteStateMachine<State, Event>({
      starting: { started: 'running' }
    , running: {
        resolve: 'done'
      , reject: 'error'
      }
    , error: {}
    , done: {}
    }, 'starting')
  }

  private createId(): string {
    return nanoid()
  }
}

class InternalError extends CustomError {}
