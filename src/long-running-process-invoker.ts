import { delay } from 'extra-promise'
import { ILongRunningProcessManager } from './types'
import { hydrate } from '@blackglory/errors'

export class LongRunningProcessInvoker<Args extends any[], Result> {
  private manager: ILongRunningProcessManager<Args, Result>
  private pollingInterval: number
  private withRetry: <T>(fn: () => T | PromiseLike<T>) => PromiseLike<T>

  constructor(options: {
    manager: ILongRunningProcessManager<Args, Result>
  , pollingInterval?: number
  , withRetry?: <T>(fn: () => T | PromiseLike<T>) => PromiseLike<T>
  }) {
    this.manager = options.manager
    this.pollingInterval = options.pollingInterval ?? 100
    this.withRetry = options.withRetry ?? (async x => await x())
  }

  async invoke(...args: Args): Promise<Awaited<Result>> {
    const id = await this.withRetry(() => this.manager.startProcess(...args))
    while (true) {
      const state = await this.withRetry(() => this.manager.getProcessState(id))
      if (state === 'done') {
        try {
          return await this.withRetry(() => this.manager.getProcessResult(id))
        } finally {
          await this.withRetry(() => this.manager.endProcess(id))
        }
      } else if (state === 'error') {
        try {
          const err = await (this.withRetry(() => this.manager.getProcessError(id)))
          throw hydrate(err)
        } finally {
          await this.withRetry(() => this.manager.endProcess(id))
        }
      } else {
        await delay(this.pollingInterval)
      }
    }
  }
}
