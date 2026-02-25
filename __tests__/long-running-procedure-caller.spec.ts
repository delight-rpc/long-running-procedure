import { describe, test, expect } from 'vitest'
import { LongRunningProcedureCaller } from '@src/long-running-procedure-caller.js'
import { getErrorPromise } from 'return-style'
import { AbortController, AbortError, withAbortSignal } from 'extra-abort'
import { delay } from 'extra-promise'
import { CustomError } from '@blackglory/errors'
import { createProcedure } from './utils.js'

describe('LongRunningProcedureCaller', () => {
  test('resolved', async () => {
    const procedure = createProcedure(async (text: string, abortSignal: AbortSignal) => {
      await delay(1000)
      return text
    })
    const caller = new LongRunningProcedureCaller(procedure)
    const controller = new AbortController()

    const result = await caller.call('result', controller.signal)

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
    const caller = new LongRunningProcedureCaller(procedure)
    const controller = new AbortController()

    const err = await getErrorPromise(caller.call('result', controller.signal))

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
    const caller = new LongRunningProcedureCaller(procedure)
    const controller = new AbortController()

    queueMicrotask(async () => {
      await delay(500)
      controller.abort()
    })
    const err = await getErrorPromise(caller.call('result', controller.signal))

    expect(err).toBeInstanceOf(AbortError)
    expect(procedure.call).toBeCalledTimes(1)
    expect(procedure.getState).not.toBeCalled()
    expect(procedure.getResult).toBeCalledTimes(1)
    expect(procedure.abort).toBeCalledTimes(1)
    expect(procedure.remove).toBeCalledTimes(1)
  })
})
