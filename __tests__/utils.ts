import { vi } from 'vitest'
import { CallState, ILongRunningProcedure } from '@src/contract.js'
import { AbortController } from 'extra-abort'
import { StatefulPromise } from 'extra-promise'
import { pass } from '@blackglory/prelude'

export function createProcedure<Args extends unknown[], Result>(
  fn: (...args: [...args: Args, signal: AbortSignal]) => Result
) {
  const controller = new AbortController()
  let promise: StatefulPromise<Result>

  return {
    call: vi.fn((args: Args): string => {
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
  , abort: vi.fn((id: string) => {
      controller.abort()
      return null
    })
  , getState: vi.fn((): CallState => {
      if (promise.isPending()) {
        return CallState.Pending
      } else {
        return CallState.Settled
      }
    })
  , getResult: vi.fn(async (id: string): Promise<Result> => {
      return await promise
    })
  , remove: vi.fn((id: string) => {
      return null
    })
  } satisfies ILongRunningProcedure<Args, Result>
}
