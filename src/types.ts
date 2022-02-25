import { SerializableError } from '@blackglory/errors'
import { Awaitable } from 'justypes'

export interface IStore<T> {
  set(key: string, value: T): Awaitable<void>
  get(key: string): Awaitable<T | null>
  delete(key: string): Awaitable<void>
}

export interface ILongRunningProcessManager<Args extends any[], Result> {
  startProcess(...args: Args): Awaitable<string>
  endProcess(id: string): Awaitable<null>
  getProcessState(id: string): Awaitable<ProcessState>
  getProcessResult(id: string): Awaitable<Result>
  getProcessError(id: string): Awaitable<SerializableError>
}

export type ProcessState = 'starting' | 'running' | 'done' | 'error'
