import { ILongRunningProcedure } from './contract.js'
import { ILongRunningProcedureCaller } from './types.js'

/**
 * 以长连接方式接收长时运行过程的结果, 结果会尽快返回.
 * 请注意, 在一些信道上维持长连接需要付出成本.
 */
export class LongRunningProcedureCaller<Args extends unknown[], Result>
implements ILongRunningProcedureCaller<Args, Result> {
  constructor(private procedure: ILongRunningProcedure<Args, Result>) {}

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

      return await this.procedure.getResult(id)
    } finally {
      await this.procedure.remove(id)
    }
  }
}
