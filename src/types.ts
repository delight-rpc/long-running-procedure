import { Awaitable, Nullable, Nullish } from '@blackglory/prelude'

export enum ProcessState {
  Pending = 'pending'
, Resolved = 'resolved'
, Rejected = 'rejected'
}

export type ProcessDetails<Result, Error> =
| [state: ProcessState.Pending]
| [state: ProcessState.Resolved, result: Result]
| [state: ProcessState.Rejected, error: Error]

export interface ILongRunningProcessService<Args extends any[], Result, Error> {
  create(...args: Args): Awaitable<string>
  get(id: string): Awaitable<Nullable<ProcessDetails<Result, Error>>>
  delete(id: string): Awaitable<Nullish>
}
