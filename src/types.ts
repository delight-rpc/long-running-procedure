import { Awaitable, Nullable, Nullish } from '@blackglory/prelude'

export enum ProcessState {
  Pending = 'pending'
, Resolved = 'resolved'
, Rejected = 'rejected'
}

export interface ILongRunningProcessService<Args extends any[], Result, Error> {
  create(...args: Args): Awaitable<string>
  getState(id: string): Awaitable<Nullable<ProcessState>>
  getValue(id: string): Awaitable<Nullable<Result | Error>>
  delete(id: string): Awaitable<Nullish>
}
