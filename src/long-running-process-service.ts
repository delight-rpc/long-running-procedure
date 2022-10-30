import { IFiniteStateMachineSchema, transition } from 'extra-fsm'
import { assert, Awaitable, Nullable, Nullish, isntNullish } from '@blackglory/prelude'
import { nanoid } from 'nanoid'
import { ILongRunningProcessService, ProcessState } from './types'
import { toResultPromise } from 'return-style'

export interface ILongRunningProcessServiceStore<Result, Error> {
  setState(id: string, state: ProcessState): Awaitable<Nullish>
  getState(id: string): Awaitable<Nullable<ProcessState>>

  setValue(id: string, value: Result | Error): Awaitable<Nullish>
  getValue(id: string): Awaitable<Nullable<Result | Error>>

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

export class LongRunningProcessService<Args extends any[], Result, Error> implements ILongRunningProcessService<Args, Result, Error> {
  constructor(
    private process: (...args: Args) => PromiseLike<Result>
  , private store: ILongRunningProcessServiceStore<Result, Error>
  ) {}

  async create(...args: Args): Promise<string> {
    const id = this.createId()
    await this.store.setState(id, ProcessState.Pending)

    queueMicrotask(async () => {
      const result = await toResultPromise<Error, Result>(this.process(...args))

      const state = await this.getState(id)
      assert(isntNullish(state), 'state is nullish')

      if (result.isOk()) {
        const newState = transition(schema, state, 'resolve')
        await this.store.setValue(id, result.unwrap())
        await this.store.setState(id, newState)
      } else {
        const newState = transition(schema, state, 'reject')
        await this.store.setValue(id, result.unwrapErr())
        await this.store.setState(id, newState)
      }
    })

    return id
  }

  async getState(id: string): Promise<Nullable<ProcessState>> {
    return await this.store.getState(id)
  }

  async getValue(id: string): Promise<Nullable<Result | Error>> {
    return await this.store.getValue(id)
  }

  async delete(id: string): Promise<Nullish> {
    const state = await this.getState(id)
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
