import { Awaitable, Nullable, Nullish } from '@blackglory/prelude'

export enum StoreItemState {
  Pending
, Resolved
, Rejected
}

export interface Store<Result, Error> {
  set(
    id: string
  , value:
    | [StoreItemState.Pending]
    | [StoreItemState.Resolved, Result]
    | [StoreItemState.Rejected, Error]
  , timeToLive?: number
  ): Awaitable<Nullish>

  get(id: string): Awaitable<Nullable<
  | [StoreItemState.Pending]
  | [StoreItemState.Resolved, Result]
  | [StoreItemState.Rejected, Error]
  >>

  delete(id: string): Awaitable<Nullish>
}

export interface ILongRunningProcedureCaller<Args extends unknown[], Result> {
  call(...args: [...args: Args, signal: AbortSignal]): Promise<Result>
}
