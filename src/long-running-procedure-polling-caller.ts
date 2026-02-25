import { delay } from 'extra-promise'
import { ILongRunningProcedure, CallState } from './contract.js'
import { ILongRunningProcedureCaller } from './types.js'

/**
 * 以轮询方式接收长时运行过程的结果, 这无法尽快返回结果.
 * 请注意, 视轮询间隔, 可能会造成很多被浪费的请求.
 */
export class LongRunningProcedurePollingCaller<Args extends unknown[], Result>
implements ILongRunningProcedureCaller<Args, Result> {
  constructor(
    private procedure: ILongRunningProcedure<Args, Result>
  , private pollingInterval: number
  ) {}

  async call(...args: [...args: Args, signal: AbortSignal]): Promise<Result> {
    const realArgs = args.slice(0, args.length - 1) as Args
    const signal = args[args.length - 1] as AbortSignal
    signal.throwIfAborted()

    const id = await this.procedure.call(realArgs)
    try {
      if (signal.aborted) {
        await this.procedure.abort(id)
      } else {
        signal.addEventListener('abort', async () => {
          await this.procedure.abort(id)
        })
      }

      while (true) {
        const state = await this.procedure.getState(id)

        switch (state) {
          case CallState.Pending: {
            await delay(this.pollingInterval)
            break
          }
          case CallState.Settled: {
            return await this.procedure.getResult(id)
          }
        }
      }
    } finally {
      await this.procedure.remove(id)
    }
  }
}
