# long-running-process
## Install
```sh
npm install --save @private/long-running-process
# or
yarn add @private/long-running-process
```

## API
```ts
interface IStore<T> {
  set(key: string, value: T): Awaitable<void>
  get(key: string): Awaitable<T | null>
  delete(key: string): Awaitable<void>
}

interface ILongRunningProcessManager<Args extends any[], Result> {
  startProcess(...args: Args): Awaitable<string>
  endProcess(id: string): Awaitable<null>
  getProcessState(id: string): Awaitable<State>
  getProcessResult(id: string): Awaitable<Result>
  getProcessError(id: string): Awaitable<SerializableError>
}

type ProcessState = 'starting' | 'running' | 'done' | 'error'
```

### LongRunningProcessManager
```ts
class LongRunningProcessManager<Args extends any[], Result> implements ILongRunningProcessManager<Args, Result> {
  constructor(options: {
    process: (...args: Args) => PromiseLike<Result>
    store: IStore<unknown>
  })
}
```

### LongRunningProcessInvoker
```ts
class LongRunningProcessInvoker<Args extends any[], Result> {
  constructor(options: {
    process: ILongRunningProcessManager<Args, Result>
  , pollingInterval: number
  , withRetry: <T>(fn: () => T) => T
  })

  invoke(args: Args): Promise<Awaited<Result>>
}
```
