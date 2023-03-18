import { delay } from 'extra-promise'
import { assert, isntNullish } from '@blackglory/prelude'
import { ILongRunningProcedureService, ProcedureState } from './types.js'

export class LongRunningProcedureClient<Args extends any[], Result, Error> {
  constructor(
    private service: ILongRunningProcedureService<Args, Result, Error>
  , private pollingInterval: number
  ) {}

  async call(...args: Args): Promise<Result> {
    const id = await this.service.create(...args)

    while (true) {
      const response = await this.service.get(id)
      assert(isntNullish(response), 'state is nullish')

      const [state, value] = response
      switch (state) {
        case ProcedureState.Pending: {
          await delay(this.pollingInterval)
          break
        }
        case ProcedureState.Resolved: {
          await this.service.delete(id)
          return value
        }
        case ProcedureState.Rejected: {
          await this.service.delete(id)
          throw value
        }
      }
    }
  }
}
