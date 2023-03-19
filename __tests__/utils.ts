import { CallState, ILongRunningProcedure } from '@src/contract.js'
import { jest } from '@jest/globals'
import { AbortController } from 'extra-abort'
import { StatefulPromise } from 'extra-promise'
import { pass } from '@blackglory/prelude'

export function createProcedure<Args extends any[], Result>(
  fn: (...args: [...args: Args, signal: AbortSignal]) => Result
) {
  const controller = new AbortController()
  let promise: StatefulPromise<Result>

  return {
    call: jest.fn((args: Args): string => {
      promise = new StatefulPromise(async (resolve, reject) => {
        try {
          const result = await fn(...args, controller.signal)
          resolve(result)
        } catch (e) {
          reject(e)
        }
      })
      promise.catch(pass)

      return 'id'
    })
  , abort: jest.fn((id: string) => {
      controller.abort()
      return null
    })
  , getState: jest.fn((): CallState => {
      if (promise.isPending()) {
        return CallState.Pending
      } else {
        return CallState.Settled
      }
    })
  , getResult: jest.fn(async (id: string): Promise<Result> => {
      return await promise
    })
  , remove: jest.fn((id: string) => {
      return null
    })
  } satisfies ILongRunningProcedure<Args, Result>
}
