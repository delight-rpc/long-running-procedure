import { IFiniteStateMachineSchema, transition } from 'extra-fsm'
import { assert, Awaitable, Nullable, Nullish, isntNullish } from '@blackglory/prelude'
import { nanoid } from 'nanoid'
import { ILongRunningProcessService, ProcessState, ProcessDetails } from './types'
import { toResultPromise } from 'return-style'

export interface ILongRunningProcessServiceStore<Result, Error> {
  set(id: string, value: ProcessDetails<Result, Error>): Awaitable<Nullish>
  get(id: string): Awaitable<Nullable<ProcessDetails<Result, Error>>>
  delete(id: string): Awaitable<Nullish>
}

const schema: IFiniteStateMachineSchema<ProcessState, 'resolve' | 'reject'> = {
  pending: {
    resolve: ProcessState.Resolved
  , reject: ProcessState.Rejected
  }
, resolved: {}
, rejected: {}
}

export class LongRunningProcessService<
  StoreResult
, StoreError
, Args extends any[]
, Result extends StoreResult
, Error extends StoreError
> implements ILongRunningProcessService<
  Args
, Result
, Error
> {
  constructor(
    private process: (...args: Args) => PromiseLike<Result>
  , private store: ILongRunningProcessServiceStore<StoreResult, StoreError>
  ) {}

  async create(...args: Args): Promise<string> {
    const id = this.createId()
    await this.store.set(id, [ProcessState.Pending])

    queueMicrotask(async () => {
      const result = await toResultPromise<Error, Result>(this.process(...args))

      const processDetails = await this.get(id)
      assert(isntNullish(processDetails), 'process does not exist')

      const [state] = processDetails
      if (result.isOk()) {
        const newState = transition(schema, state, 'resolve') as ProcessState.Resolved
        await this.store.set(id, [newState, result.unwrap()])
      } else {
        const newState = transition(schema, state, 'reject') as ProcessState.Rejected
        await this.store.set(id, [newState, result.unwrapErr()])
      }
    })

    return id
  }

  async get(id: string): Promise<Nullable<ProcessDetails<Result, Error>>> {
    const processDetails = await this.store.get(id)
    return processDetails as Nullable<ProcessDetails<Result, Error>>
  }

  async delete(id: string): Promise<Nullish> {
    const processDetails = await this.get(id)
    assert(isntNullish(processDetails), 'process does not exist')

    const [state] = processDetails
    assert(
      state === ProcessState.Resolved || state === ProcessState.Rejected
    , `The state of process is not ${ProcessState.Resolved} or ${ProcessState.Rejected}`
    )

    await this.store.delete(id)

    return undefined
  }

  private createId(): string {
    return nanoid()
  }
}
