import { delay } from 'extra-promise'
import { assert, isntNullish } from '@blackglory/prelude'
import { ILongRunningProcessService, ProcessState } from './types'

export class LongRunningProcessClient<Args extends any[], Result, Error> {
  constructor(
    private service: ILongRunningProcessService<Args, Result, Error>
  , private pollingInterval: number
  ) {}

  async call(...args: Args): Promise<Awaited<Result>> {
    const id = await this.service.create(...args)

    while (true) {
      const state = await this.service.getState(id)
      assert(isntNullish(state), 'state is nullish')

      switch (state) {
        case ProcessState.Pending: {
          await delay(this.pollingInterval)
          break
        }
        case ProcessState.Resolved: {
          try {
            const result = await this.service.getValue(id)
            assert(isntNullish(result), 'result is nullish')

            return result as Awaited<Result>
          } finally {
            await this.service.delete(id)
          }
        }
        case ProcessState.Rejected: {
          try {
            const error = await this.service.getValue(id)
            assert(isntNullish(error), 'error is nullish')

            throw error as Awaited<Error>
          } finally {
            await this.service.delete(id)
          }
        }
      }
    }
  }
}
