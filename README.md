# long-running-process
## Install
```sh
npm install --save @private/long-running-process
# or
yarn add @private/long-running-process
```

## API
### LongRunningProcessManager
```ts
interface IStore<T> {
  set(key: string, value: T): Awaitable<void>
  get(key: string): Awaitable<T | null>
  delete(key: string): Awaitable<void>
}

interface ILongRunningProcessManager<Args extends any[], Result> {
  startProcess(...args: Args): Awaitable<string>
  endProcess(id: string): Awaitable<null>
  getProcessState(id: string): Awaitable<'starting' | 'running' | 'done' | 'error'>
  getProcessResult(id: string): Awaitable<Result>
  getProcessError(id: string): Awaitable<SerializableError>
}

class LongRunningProcessManager<Args extends any[], Result> implements ILongRunningProcessManager<Args, Result> {
  constructor(options: {
    process: (...args: Args) => PromiseLike<Result>
    store: IStore<Result>
  })
}
```
