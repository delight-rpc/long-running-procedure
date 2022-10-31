# long-running-process
## Install
```sh
npm install --save @private/long-running-process
# or
yarn add @private/long-running-process
```

## API
```ts
enum ProcessState {
  Pending = 'pending'
, Resolved = 'resolved'
, Rejected = 'rejected'
}

type ProcessDetails<Result, Error> =
| [state: ProcessState.Pending]
| [state: ProcessState.Resolved, result: Result]
| [state: ProcessState.Rejected, error: Error]

interface ILongRunningProcessService<Args extends any[], Result, Error> {
  create(...args: Args): Awaitable<string>
  get(id: string): Awaitable<Nullable<ProcessDetails<Result, Error>>>
  delete(id: string): Awaitable<Nullish>
}
```

### LongRunningProcessClient
```ts
class LongRunningProcessClient<Args extends any[], Result, Error> {
  constructor(
    service: ILongRunningProcessService<Args, Result, Error>
  , pollingInterval: number
  )

  call(...args: Args): Promise<Result>
}
```

### LongRunningProcess
```ts
interface ILongRunningProcessServiceStore<Result, Error> {
  set(id: string, value: ProcessDetails<Result, Error>): Awaitable<Nullish>
  get(id: string): Awaitable<Nullable<ProcessDetails<Result, Error>>>
  delete(id: string): Awaitable<Nullish>
}

class LongRunningProcessService<
  StoreResult
, StoreError
, Args extends any[]
, Result extends StoreResult
, Error extends StoreError
> implements ILongRunningProcessService<Args, Result, Error> {
  constructor(
    process: (...args: Args) => PromiseLike<Result>
  , store: ILongRunningProcessServiceStore<StoreResult, StoreError>
  )
}
```
