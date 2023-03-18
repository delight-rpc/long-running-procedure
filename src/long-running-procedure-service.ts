import { IFiniteStateMachineSchema, transition } from 'extra-fsm'
import { assert, Awaitable, Nullable, Nullish, isntNullish } from '@blackglory/prelude'
import { nanoid } from 'nanoid'
import { ILongRunningProcedureService, ProcedureState, ProcedureDetails } from './types.js'
import { toResultPromise } from 'return-style'

export interface ILongRunningProcedureServiceStore<Result, Error> {
  set(id: string, value: ProcedureDetails<Result, Error>): Awaitable<Nullish>
  get(id: string): Awaitable<Nullable<ProcedureDetails<Result, Error>>>
  delete(id: string): Awaitable<Nullish>
}

const schema: IFiniteStateMachineSchema<ProcedureState, 'resolve' | 'reject'> = {
  pending: {
    resolve: ProcedureState.Resolved
  , reject: ProcedureState.Rejected
  }
, resolved: {}
, rejected: {}
}

export class LongRunningProcedureService<
  StoreResult
, StoreError
, Args extends any[]
, Result extends StoreResult
, Error extends StoreError
> implements ILongRunningProcedureService<
  Args
, Result
, Error
> {
  constructor(
    private procedure: (...args: Args) => PromiseLike<Result>
  , private store: ILongRunningProcedureServiceStore<StoreResult, StoreError>
  ) {}

  async create(...args: Args): Promise<string> {
    const id = this.createId()
    await this.store.set(id, [ProcedureState.Pending])

    queueMicrotask(async () => {
      const result = await toResultPromise<Error, Result>(this.procedure(...args))

      const processDetails = await this.get(id)
      assert(isntNullish(processDetails), 'process does not exist')

      const [state] = processDetails
      if (result.isOk()) {
        const newState = transition(schema, state, 'resolve') as ProcedureState.Resolved
        await this.store.set(id, [newState, result.unwrap()])
      } else {
        const newState = transition(schema, state, 'reject') as ProcedureState.Rejected
        await this.store.set(id, [newState, result.unwrapErr()])
      }
    })

    return id
  }

  async get(id: string): Promise<ProcedureDetails<Result, Error> | null> {
    const processDetails = await this.store.get(id) ?? null
    return processDetails as ProcedureDetails<Result, Error> | null
  }

  async delete(id: string): Promise<null> {
    const processDetails = await this.get(id)
    assert(isntNullish(processDetails), 'process does not exist')

    const [state] = processDetails
    assert(
      state === ProcedureState.Resolved || state === ProcedureState.Rejected
    , `The state of process is not ${ProcedureState.Resolved} or ${ProcedureState.Rejected}`
    )

    await this.store.delete(id)

    return null
  }

  private createId(): string {
    return nanoid()
  }
}
