import { describe, test, expect, vi } from 'vitest'
import { CallNotFound, CallState } from '@src/contract.js'
import { LongRunningProcedure } from '@src/long-running-procedure/index.js'
import { Store, StoreItemState } from '@src/types.js'
import { Deferred, delay, StatefulPromise, StatefulPromiseState } from 'extra-promise'
import { Nullable } from '@blackglory/prelude'
import { getErrorPromise } from 'return-style'
import { AbortError, withAbortSignal } from 'extra-abort'
import { waitForAllMacrotasksProcessed, waitForTimeout } from '@blackglory/wait-for'

describe('LongRunningProcedure', () => {
  describe('call', () => {
    test('resolved', async () => {
      const deferred = new Deferred<void>()
      const fn = vi.fn(async (text: string, signal: AbortSignal) => {
        await deferred
        return text
      })
      const store = createMockedStore()
      const timeout = 500
      const timeToLive = 1000
      const procedure = new LongRunningProcedure(fn, {
        store
      , timeout
      , timeToLive
      })

      const id = await procedure.call(['result'])
      const state1 = await procedure.getState(id)
      deferred.resolve()
      await waitForAllMacrotasksProcessed()
      const state2 = await procedure.getState(id)
      const result = await procedure.getResult(id)

      expect(id).not.toBe('')
      expect(state1).toBe(CallState.Pending)
      expect(state2).toBe(CallState.Settled)
      expect(result).toBe('result')
      expect(fn).toBeCalledTimes(1)
      expect(fn).toBeCalledWith('result', expect.any(AbortSignal))
      expect(store.set).toBeCalledTimes(2)
      expect(store.set).nthCalledWith(1, id, [StoreItemState.Pending], timeout)
      expect(store.set).nthCalledWith(2, id, [StoreItemState.Resolved, 'result'], timeToLive)
      expect(store.delete).not.toBeCalled()
    })

    test('rejected', async () => {
      const deferred = new Deferred<void>()
      const fn = vi.fn(async (text: string, signal: AbortSignal) => {
        await deferred
        return text
      })
      const store = createMockedStore()
      const timeout = 500
      const timeToLive = 1000
      const procedure = new LongRunningProcedure(fn, {
        store
      , timeout
      , timeToLive
      })

      const id = await procedure.call(['result'])
      const state1 = await procedure.getState(id)
      deferred.reject('error')
      await waitForAllMacrotasksProcessed()
      const state2 = await procedure.getState(id)
      const err = await getErrorPromise(procedure.getResult(id))

      expect(id).not.toBe('')
      expect(state1).toBe(CallState.Pending)
      expect(state2).toBe(CallState.Settled)
      expect(err).toBe('error')
      expect(fn).toBeCalledTimes(1)
      expect(fn).toBeCalledWith('result', expect.any(AbortSignal))
      expect(store.set).toBeCalledTimes(2)
      expect(store.set).nthCalledWith(1, id, [StoreItemState.Pending], timeout)
      expect(store.set).nthCalledWith(2, id, [StoreItemState.Rejected, 'error'], timeToLive)
      expect(store.delete).not.toBeCalled()
    })

    test('timeout', async () => {
      const fn = vi.fn(async (signal: AbortSignal) => {
        while (true) {
          signal.throwIfAborted()

          await delay(100)
        }
      })
      const store = createMockedStore()
      const timeout = 500
      const timeToLive = 1000
      const procedure = new LongRunningProcedure(fn, {
        store
      , timeout
      , timeToLive
      })

      const id = await procedure.call([])
      const state1 = await procedure.getState(id)
      const err = await getErrorPromise(procedure.getResult(id))
      const state2 = await procedure.getState(id)

      expect(state1).toBe(CallState.Pending)
      expect(state2).toBe(CallState.Settled)
      expect(err).toBeInstanceOf(AbortError)
      expect(fn).toBeCalledTimes(1)
      expect(fn).toBeCalledWith(expect.any(AbortSignal))
      expect(store.set).toBeCalledTimes(2)
      expect(store.set).nthCalledWith(1, id, [StoreItemState.Pending], timeout)
      expect(store.set).nthCalledWith(2, id, [StoreItemState.Rejected, expect.any(AbortError)], timeToLive)
      expect(store.delete).not.toBeCalled()
    })

    test('timeToLive', async () => {
      const result = 'result'
      const fn = vi.fn(async () => result)
      const store = createMockedStore()
      const timeout = 500
      const timeToLive = 1000
      const procedure = new LongRunningProcedure(fn, {
        store
      , timeout
      , timeToLive
      })

      const id = await procedure.call([])
      const state1 = await procedure.getState(id)
      await procedure.getResult(id)
      const state2 = await procedure.getState(id)
      await waitForTimeout(timeToLive)
      const state3 = await getErrorPromise(procedure.getState(id))
      const err = await getErrorPromise(procedure.getResult(id))

      expect(state1).toBe(CallState.Pending)
      expect(state2).toBe(CallState.Settled)
      expect(state3).toBeInstanceOf(CallNotFound)
      expect(err).toBeInstanceOf(CallNotFound)
      expect(fn).toBeCalledTimes(1)
      expect(fn).toBeCalledWith(expect.any(AbortSignal))
      expect(store.set).toBeCalledTimes(2)
      expect(store.set).nthCalledWith(1, id, [StoreItemState.Pending], timeout)
      expect(store.set).nthCalledWith(2, id, [StoreItemState.Resolved, result], timeToLive)
      expect(store.delete).toBeCalledTimes(1)
      expect(store.delete).toBeCalledWith(id)
    })
  })

  describe('abort', () => {
    test('call does not exist', () => {
      const deferred = new Deferred<void>()
      const fn = vi.fn(async (signal: AbortSignal) => await deferred)
      const procedure = new LongRunningProcedure(fn)
      const id = 'id'

      procedure.abort(id)
    })

    describe('call exists', () => {
      test('pending', async () => {
        const deferred = new Deferred<string>()
        const fn = vi.fn(async (signal: AbortSignal) => {
          return await withAbortSignal(signal, () => deferred)
        })
        const procedure = new LongRunningProcedure(fn)

        const id = await procedure.call([])
        await waitForAllMacrotasksProcessed()
        procedure.abort(id)
        await waitForAllMacrotasksProcessed()

        const state = await procedure.getState(id)
        expect(state).toBe(CallState.Settled)
        const err = await getErrorPromise(procedure.getResult(id))
        expect(err).toBeInstanceOf(AbortError)
      })

      test('resolved', async () => {
        const deferred = new Deferred<string>()
        const fn = vi.fn(async (signal: AbortSignal) => {
          return await withAbortSignal(signal, () => deferred)
        })
        const procedure = new LongRunningProcedure(fn)

        const id = await procedure.call([])
        deferred.resolve('result')
        await waitForAllMacrotasksProcessed()
        procedure.abort(id)

        const state = await procedure.getState(id)
        expect(state).toBe(CallState.Settled)
        const result = await procedure.getResult(id)
        expect(result).toBe('result')
      })

      test('rejected', async () => {
        const deferred = new Deferred<void>()
        const fn = vi.fn(async (signal: AbortSignal) => {
          return await withAbortSignal(signal, () => deferred)
        })
        const procedure = new LongRunningProcedure(fn)

        const id = await procedure.call([])
        deferred.reject('error')
        await waitForAllMacrotasksProcessed()
        procedure.abort(id)

        const state = await procedure.getState(id)
        expect(state).toBe(CallState.Settled)
        const err = await getErrorPromise(procedure.getResult(id))
        expect(err).toBe('error')
      })

      test('aborted', async () => {
        const deferred = new Deferred<void>()
        const fn = vi.fn(async (signal: AbortSignal) => {
          return await withAbortSignal(signal, () => deferred)
        })
        const procedure = new LongRunningProcedure(fn)

        const id = await procedure.call([])
        procedure.abort(id)
        await waitForAllMacrotasksProcessed()
        procedure.abort(id)

        const state = await procedure.getState(id)
        expect(state).toBe(CallState.Settled)
        const err = await getErrorPromise(procedure.getResult(id))
        expect(err).toBeInstanceOf(AbortError)
      })
    })
  })

  describe('getState', () => {
    test('call does not exist', async () => {
      const deferred = new Deferred<void>()
      const fn = vi.fn(async (signal: AbortSignal) => await deferred)
      const procedure = new LongRunningProcedure(fn)
      const id = 'id'

      const err = await getErrorPromise(procedure.getState(id))

      expect(err).toBeInstanceOf(CallNotFound)
    })

    describe('call exists', () => {
      test('pending', async () => {
        const deferred = new Deferred<void>()
        const fn = vi.fn(async (signal: AbortSignal) => await deferred)
        const procedure = new LongRunningProcedure(fn)

        const id = await procedure.call([])
        try {
          const state = await procedure.getState(id)

          expect(state).toBe(CallState.Pending)
        } finally {
          deferred.resolve()
        }
      })

      test('resolved', async () => {
        const deferred = new Deferred<void>()
        const fn = vi.fn(async (signal: AbortSignal) => await deferred)
        const procedure = new LongRunningProcedure(fn)

        const id = await procedure.call([])
        deferred.resolve()
        await waitForAllMacrotasksProcessed()
        const state = await procedure.getState(id)

        expect(state).toBe(CallState.Settled)
      })

      test('rejected', async () => {
        const deferred = new Deferred<void>()
        const fn = vi.fn(async (signal: AbortSignal) => await deferred)
        const procedure = new LongRunningProcedure(fn)

        const id = await procedure.call([])
        deferred.reject('error')
        await waitForAllMacrotasksProcessed()
        const state = await procedure.getState(id)

        expect(state).toBe(CallState.Settled)
      })

      test('aborted', async () => {
        const deferred = new Deferred<void>()
        const fn = vi.fn(async (signal: AbortSignal) => {
          await withAbortSignal(signal, () => deferred)
        })
        const procedure = new LongRunningProcedure(fn)

        const id = await procedure.call([])
        procedure.abort(id)
        try {
          await waitForAllMacrotasksProcessed()
          const state = await procedure.getState(id)

          expect(state).toBe(CallState.Settled)
        } finally {
          deferred.resolve()
        }
      })
    })
  })

  describe('getResult', () => {
    test('call does not exist', async () => {
      const deferred = new Deferred<string>()
      const fn = vi.fn(async (signal: AbortSignal) => await deferred)
      const procedure = new LongRunningProcedure(fn)
      const id = 'id'

      const err = await getErrorPromise(procedure.getResult(id))

      expect(err).toBeInstanceOf(CallNotFound)
    })

    describe('call exists', () => {
      test('pending', async () => {
        const deferred = new Deferred<void>()
        const fn = vi.fn(async (signal: AbortSignal) => await deferred)
        const procedure = new LongRunningProcedure(fn)

        const id = await procedure.call([])
        const promise = new StatefulPromise((resolve, reject) => {
          procedure.getResult(id).then(resolve, reject)
        })
        await waitForAllMacrotasksProcessed()
        const state1 = promise.state
        deferred.resolve()
        await waitForAllMacrotasksProcessed()
        const state2 = promise.state

        expect(state1).toBe(StatefulPromiseState.Pending)
        expect(state2).toBe(StatefulPromiseState.Fulfilled)
      })

      test('resolved', async () => {
        const deferred = new Deferred<string>()
        const fn = vi.fn(async (signal: AbortSignal) => await deferred)
        const procedure = new LongRunningProcedure(fn)

        const id = await procedure.call([])
        deferred.resolve('result')
        await waitForAllMacrotasksProcessed()
        const result = await procedure.getResult(id)

        expect(result).toBe('result')
      })

      test('rejected', async () => {
        const deferred = new Deferred<void>()
        const fn = vi.fn(async (signal: AbortSignal) => await deferred)
        const procedure = new LongRunningProcedure(fn)

        const id = await procedure.call([])
        deferred.reject('error')
        await waitForAllMacrotasksProcessed()
        const err = await getErrorPromise(procedure.getResult(id))

        expect(err).toBe('error')
      })

      test('aborted', async () => {
        const deferred = new Deferred<void>()
        const fn = vi.fn(async (signal: AbortSignal) => {
          await withAbortSignal(signal, () => deferred)
        })
        const procedure = new LongRunningProcedure(fn)

        const id = await procedure.call([])
        procedure.abort(id)
        try {
          await waitForAllMacrotasksProcessed()
          const err = await getErrorPromise(procedure.getResult(id))

          expect(err).toBeInstanceOf(AbortError)
        } finally {
          deferred.resolve()
        }
      })
    })
  })

  describe('remove', () => {
    test('call does not exist', async () => {
      const deferred = new Deferred<string>()
      const fn = vi.fn(async (signal: AbortSignal) => await deferred)
      const procedure = new LongRunningProcedure(fn)
      const id = 'id'

      await procedure.remove(id)
    })

    describe('call exists', () => {
      test('pending', async () => {
        const deferred = new Deferred<void>()
        const fn = vi.fn(async (signal: AbortSignal) => await deferred)
        const procedure = new LongRunningProcedure(fn)

        const id = await procedure.call([])
        try {
          const err = await getErrorPromise(procedure.remove(id))

          expect(err?.message).toMatch('The call is still pending')
          const state = await procedure.getState(id)
          expect(state).toBe(CallState.Pending)
        } finally {
          deferred.resolve()
        }
      })

      test('resolved', async () => {
        const deferred = new Deferred<string>()
        const fn = vi.fn(async (signal: AbortSignal) => await deferred)
        const procedure = new LongRunningProcedure(fn)

        const id = await procedure.call([])
        deferred.resolve('result')
        await waitForAllMacrotasksProcessed()
        await procedure.remove(id)

        const err = await getErrorPromise(procedure.getState(id))
        expect(err).toBeInstanceOf(CallNotFound)
      })

      test('rejected', async () => {
        const deferred = new Deferred<void>()
        const fn = vi.fn(async (signal: AbortSignal) => await deferred)
        const procedure = new LongRunningProcedure(fn)

        const id = await procedure.call([])
        deferred.reject('error')
        await waitForAllMacrotasksProcessed()
        await procedure.remove(id)

        const err = await getErrorPromise(procedure.getState(id))
        expect(err).toBeInstanceOf(CallNotFound)
      })

      test('aborted', async () => {
        const deferred = new Deferred<void>()
        const fn = vi.fn(async (signal: AbortSignal) => {
          await withAbortSignal(signal, () => deferred)
        })
        const procedure = new LongRunningProcedure(fn)

        const id = await procedure.call([])
        await waitForAllMacrotasksProcessed()
        procedure.abort(id)
        await waitForAllMacrotasksProcessed()
        await procedure.remove(id)

        const err = await getErrorPromise(procedure.getState(id))
        expect(err).toBeInstanceOf(CallNotFound)
      })
    })
  })
})

function createMockedStore() {
  const map = new Map<string, unknown>()

  return {
    get: vi.fn((id: string) => {
      const result = map.get(id)

      return result as Nullable<
      | [StoreItemState.Pending]
      | [StoreItemState.Resolved, unknown]
      | [StoreItemState.Rejected, Error]
      >
    })
  , set: vi.fn((
      id: string
    , item:
      | [StoreItemState.Pending]
      | [StoreItemState.Resolved, unknown]
      | [StoreItemState.Rejected, Error]
    ) => {
      map.set(id, item)

      return undefined
    })
  , delete: vi.fn((id: string) => {
      map.delete(id)

      return undefined
    })
  } satisfies Store<unknown, unknown>
}
