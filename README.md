# long-running-procedure
## Install
```sh
npm install --save @private/long-running-procedure
# or
yarn add @private/long-running-procedure
```

## API
```ts
enum CallState {
  Pending
, Settled
}

interface ILongRunningProcedure<Args extends any[], Result> {
  /**
   * 调用此过程.
   * 
   * @returns 该调用的id.
   */
  call(args: Args): Awaitable<string>

  /**
   * 中断一个还未完成的调用.
   * 如果该调用已经完成或调用不存在, 该函数会静默失败.
   */
  abort(id: string): Awaitable<Nullish>

  /**
   * 返回调用的状态.
   * 
   * @throws {CallNotFound}
   */
  getState(id: string): Awaitable<CallState>

  /**
   * 获取调用的结果, 如果调用尚未完成, 则会阻塞直到完成.
   * 
   * @throws {CallNotFound}
   */
  getResult(id: string): Awaitable<Result>

  /**
   * 删除一个已经完成的调用, 这会导致与该调用相关的信息被删除.
   * 如果该调用还未完成, 则该操作会抛出错误.
   * 如果该调用已经删除, 则该操作会静默失败.
   */
  remove(id: string): Awaitable<Nullish>
}

class CallNotFound extends CustomError {}
```

### LongRunningProcedure
```ts
class LongRunningProcedure<Args extends unknown[], Result, Error>
implements ILongRunningProcedure<Args, Result> {
  /**
   * 超时和TTL的存在是为了减缓错误的实现耗尽存储空间的速度.
   * 
   * @param timeout 调用的超时时间(毫秒), 超时的调用会被自动中断.
   * @param timeToLive 调用从完成开始计算的存活时间(毫秒), 超出存活时间的调用会被删除.
   */
  constructor(
    procedure: (...args: [...Args, AbortSignal]) => PromiseLike<Result>
  , options?: {
      store?: Store<Result, Error>
      timeout?: number
      timeToLive?: number
    }
  )
}
```

### Caller
```ts
interface ILongRunningProcedureCaller<Args extends unknown[], Result> {
  call(...args: [...args: Args, signal: AbortSignal]): Promise<Result>
}
```

#### LongRunningProcedureCaller
```ts
/**
 * 以长连接方式接收长时运行过程的结果, 结果会尽快返回.
 * 请注意, 在一些信道上维持长连接需要付出成本.
 */
class LongRunningProcedureCaller<Args extends unknown[], Result>
implements ILongRunningProcedureCaller<Args, Result> {
  constructor(procedure: ILongRunningProcedure<Args, Result>)
}
```

#### LongRunningProcedurePollingCaller
```ts
/**
 * 以轮询方式接收长时运行过程的结果, 这无法尽快返回结果.
 * 请注意, 视轮询间隔, 可能会造成很多被浪费的请求.
 */
class LongRunningProcedurePollingCaller<Args extends unknown[], Result>
implements ILongRunningProcedureCaller<Args, Result> {
  constructor(
    procedure: ILongRunningProcedure<Args, Result>
  , pollingInterval: number
  )
}
```

### Store
```ts
enum StoreItemState {
  Pending
, Resolved
, Rejected
}

interface Store<Result, Error> {
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
```

#### MemoryStore
```ts
class MemoryStore<Result, Error> implements Store<Result, Error> {}
```
