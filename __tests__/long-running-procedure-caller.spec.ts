import { CallState, ILongRunningProcedure } from '@src/contract.js'
import { LongRunningProcedureCaller } from '@src/long-running-procedure-caller.js'
import { getErrorPromise } from 'return-style'
import { jest } from '@jest/globals'
import { AbortController, AbortError, withAbortSignal } from 'extra-abort'
import { delay, StatefulPromise } from 'extra-promise'
import { CustomError } from '@blackglory/errors'
import { pass } from '@blackglory/prelude'

describe('LongRunningProcedureCaller', () => {
  describe('callAndWait', () => {
    test('resolved', async () => {
      const procedure = createProcedure(async (text: string, abortSignal: AbortSignal) => {
        await delay(1000)
        return text
      })
      const caller = new LongRunningProcedureCaller(procedure, 100)
      const controller = new AbortController()

      const result = await caller.callAndWait('result', controller.signal)

      expect(result).toBe('result')
      expect(procedure.call).toBeCalledTimes(1)
      expect(procedure.getState).not.toBeCalled()
      expect(procedure.getResult).toBeCalledTimes(1)
      expect(procedure.remove).toBeCalledTimes(1)
    })

    test('rejected', async () => {
      class InternalError extends CustomError {}
      const procedure = createProcedure(async (text: string, singal: AbortSignal) => {
        await delay(1000)
        throw new InternalError()
      })
      const caller = new LongRunningProcedureCaller(procedure, 100)
      const controller = new AbortController()

      const err = await getErrorPromise(caller.callAndWait('result', controller.signal))

      expect(err).toBeInstanceOf(InternalError)
      expect(procedure.call).toBeCalledTimes(1)
      expect(procedure.getState).not.toBeCalled()
      expect(procedure.getResult).toBeCalledTimes(1)
      expect(procedure.remove).toBeCalledTimes(1)
    })

    test('aborted', async () => {
      class InternalError extends CustomError {}
      const procedure = createProcedure(async (text: string, signal: AbortSignal) => {
        await withAbortSignal(signal, () => delay(1000))
        throw new InternalError()
      })
      const caller = new LongRunningProcedureCaller(procedure, 100)
      const controller = new AbortController()

      queueMicrotask(async () => {
        await delay(500)
        controller.abort()
      })
      const err = await getErrorPromise(caller.callAndWait('result', controller.signal))

      expect(err).toBeInstanceOf(AbortError)
      expect(procedure.call).toBeCalledTimes(1)
      expect(procedure.getState).not.toBeCalled()
      expect(procedure.getResult).toBeCalledTimes(1)
      expect(procedure.abort).toBeCalledTimes(1)
      expect(procedure.remove).toBeCalledTimes(1)
    })
  })

  describe('callAndPoll', () => {
    test('resolved', async () => {
      const procedure = createProcedure(async (text: string, abortSignal: AbortSignal) => {
        await delay(1000)
        return text
      })
      const caller = new LongRunningProcedureCaller(procedure, 100)
      const controller = new AbortController()

      const result = await caller.callAndPoll('result', controller.signal)

      expect(result).toBe('result')
      expect(procedure.call).toBeCalledTimes(1)
      expect(procedure.getState).toBeCalledTimes(11)
      expect(procedure.getResult).toBeCalledTimes(1)
      expect(procedure.remove).toBeCalledTimes(1)
    })

    test('rejected', async () => {
      class InternalError extends CustomError {}
      const procedure = createProcedure(async (text: string, singal: AbortSignal) => {
        await delay(1000)
        throw new InternalError()
      })
      const caller = new LongRunningProcedureCaller(procedure, 100)
      const controller = new AbortController()

      const err = await getErrorPromise(caller.callAndPoll('result', controller.signal))

      expect(err).toBeInstanceOf(InternalError)
      expect(procedure.call).toBeCalledTimes(1)
      expect(procedure.getState).toBeCalledTimes(11)
      expect(procedure.getResult).toBeCalledTimes(1)
      expect(procedure.remove).toBeCalledTimes(1)
    })

    test('aborted', async () => {
      class InternalError extends CustomError {}
      const procedure = createProcedure(async (text: string, signal: AbortSignal) => {
        await withAbortSignal(signal, () => delay(1000))
        throw new InternalError()
      })
      const caller = new LongRunningProcedureCaller(procedure, 100)
      const controller = new AbortController()

      queueMicrotask(async () => {
        await delay(500)
        controller.abort()
      })
      const err = await getErrorPromise(caller.callAndPoll('result', controller.signal))

      expect(err).toBeInstanceOf(AbortError)
      expect(procedure.call).toBeCalledTimes(1)
      expect(procedure.getState).toBeCalledTimes(6)
      expect(procedure.getResult).toBeCalledTimes(1)
      expect(procedure.abort).toBeCalledTimes(1)
      expect(procedure.remove).toBeCalledTimes(1)
    })
  })
})

function createProcedure<Args extends any[], Result>(
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
