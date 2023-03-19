import { delay } from 'extra-promise'
import { ILongRunningProcedure, CallState } from './contract.js'

export class LongRunningProcedureCaller<Args extends unknown[], Result> {
  constructor(
    private procedure: ILongRunningProcedure<Args, Result>
  , private pollingInterval: number
  ) {}

  /**
   * 以长连接方式接收长时运行过程的结果, 结果会尽快返回.
   * 请注意, 在一些信道上维持长连接需要付出成本.
   */
  async callAndWait(...args: [...args: Args, signal: AbortSignal]): Promise<Result> {
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

      return await this.procedure.getResult(id)
    } finally {
      await this.procedure.remove(id)
    }
  }

  /**
   * 以轮询方式接收长时运行过程的结果, 这无法尽快返回结果.
   * 请注意, 视轮询间隔, 可能会造成很多被浪费的请求.
   */
  async callAndPoll(...args: [...args: Args, signal: AbortSignal]): Promise<Result> {
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
