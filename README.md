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

interface ILongRunningProcessService<Args extends any[], Result, Error> {
  create(...args: Args): Awaitable<string>
  getState(id: string): Awaitable<Nullable<ProcessState>>
  getValue(id: string): Awaitable<Nullable<Result | Error>>
  delete(id: string): Awaitable<Nullish>
}
```

### LongRunningProcessClient
```ts
class LongRunningProcessClient<Args extends any[], Result, Error> {
  constructor(
    proxy: ILongRunningProcess<Args, Result, Error>
  , pollingInterval: number
  )

  call(...args: Args): Promise<Awaited<Result>>
}
```

### LongRunningProcess
```ts
interface ILongRunningProcessServiceStore<Result, Error> {
  setState(id: string, state: ProcessState): Awaitable<Nullish>
  getState(id: string): Awaitable<Nullable<ProcessState>>

  setValue(id: string, value: Result | Error): Awaitable<Nullish>
  getValue(id: string): Awaitable<Nullable<Result | Error>>

  delete(id: string): Awaitable<Nullish>
}

class LongRunningProcessService<Args extends any[], Result, Error> implements ILongRunningProcessService<Args extends any[], Result, Error> {
  constructor(
    process: (...args: Args) => PromiseLike<Result>
  , store: ILongRunningProcessServiceStore<Result, Error>
  )
}
```
