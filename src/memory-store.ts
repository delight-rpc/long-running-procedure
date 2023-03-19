import { Awaitable, Nullish, Nullable } from '@blackglory/prelude'
import { ExpirableMap } from '@blackglory/structures'
import { Store, StoreItemState } from './types.js'

export class MemoryStore<Result, Error> implements Store<Result, Error> {
  private map = new ExpirableMap<
    string
  , | [StoreItemState.Pending]
    | [StoreItemState.Resolved, Result]
    | [StoreItemState.Rejected, Error]
  >()

  set(
    id: string
  , value:
    | [StoreItemState.Pending]
    | [StoreItemState.Resolved, Result]
    | [StoreItemState.Rejected, Error]
  , timeToLive?: number
  ): null {
    this.map.set(id, value, timeToLive)

    return null
  }

  get(id: string): Awaitable<Nullable<
  | [StoreItemState.Pending]
  | [StoreItemState.Resolved, Result]
  | [StoreItemState.Rejected, Error]
  >> {
    return this.map.get(id)
  }

  delete(id: string): Awaitable<Nullish> {
    this.map.delete(id)

    return null
  }
}
