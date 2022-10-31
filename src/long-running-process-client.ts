import { delay } from 'extra-promise'
import { assert, isntNullish } from '@blackglory/prelude'
import { ILongRunningProcessService, ProcessState } from './types'

export class LongRunningProcessClient<Args extends any[], Result, Error> {
  constructor(
    private service: ILongRunningProcessService<Args, Result, Error>
  , private pollingInterval: number
  ) {}

  async call(...args: Args): Promise<Result> {
    const id = await this.service.create(...args)

    while (true) {
      const response = await this.service.get(id)
      assert(isntNullish(response), 'state is nullish')

      const [state, value] = response
      switch (state) {
        case ProcessState.Pending: {
          await delay(this.pollingInterval)
          break
        }
        case ProcessState.Resolved: {
          await this.service.delete(id)
          return value
        }
        case ProcessState.Rejected: {
          await this.service.delete(id)
          throw value
        }
      }
    }
  }
}
