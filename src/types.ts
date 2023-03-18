import { Awaitable, Nullable, Nullish } from '@blackglory/prelude'

export enum ProcedureState {
  Pending = 'pending'
, Resolved = 'resolved'
, Rejected = 'rejected'
}

export type ProcedureDetails<Result, Error> =
| [state: ProcedureState.Pending]
| [state: ProcedureState.Resolved, result: Result]
| [state: ProcedureState.Rejected, error: Error]

export interface ILongRunningProcedureService<Args extends any[], Result, Error> {
  create(...args: Args): Awaitable<string>
  get(id: string): Awaitable<Nullable<ProcedureDetails<Result, Error>>>
  delete(id: string): Awaitable<Nullish>
}
