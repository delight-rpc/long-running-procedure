# long-running-procedure
## Install
```sh
npm install --save @private/long-running-procedure
# or
yarn add @private/long-running-procedure
```

## API
```ts
enum ProcedureState {
  Pending = 'pending'
, Resolved = 'resolved'
, Rejected = 'rejected'
}

type ProcedureDetails<Result, Error> =
| [state: ProcedureState.Pending]
| [state: ProcedureState.Resolved, result: Result]
| [state: ProcedureState.Rejected, error: Error]

interface ILongRunningProcedureService<Args extends any[], Result, Error> {
  create(...args: Args): Awaitable<string>
  get(id: string): Awaitable<Nullable<ProcedureDetails<Result, Error>>>
  delete(id: string): Awaitable<Nullish>
}
```

### LongRunningProcedureClient
```ts
class LongRunningProcedureClient<Args extends any[], Result, Error> {
  constructor(
    service: ILongRunningProcedureService<Args, Result, Error>
  , pollingInterval: number
  )

  call(...args: Args): Promise<Result>
}
```

### LongRunningProcedure
```ts
interface ILongRunningProcedureServiceStore<Result, Error> {
  set(id: string, value: ProcedureDetails<Result, Error>): Awaitable<Nullish>
  get(id: string): Awaitable<Nullable<ProcedureDetails<Result, Error>>>
  delete(id: string): Awaitable<Nullish>
}

class LongRunningProcedureService<
  StoreResult
, StoreError
, Args extends any[]
, Result extends StoreResult
, Error extends StoreError
> implements ILongRunningProcedureService<Args, Result, Error> {
  constructor(
    procedure: (...args: Args) => PromiseLike<Result>
  , store: ILongRunningProcedureServiceStore<StoreResult, StoreError>
  )
}
```
