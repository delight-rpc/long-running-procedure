import { LongRunningProcedureClient } from '@src/long-running-procedure-client.js'
import { ProcedureState, ILongRunningProcedureService, ProcedureDetails } from '@src/types.js'
import { getErrorPromise } from 'return-style'
import { jest } from '@jest/globals'
import { Awaitable, Nullable } from '@blackglory/prelude'

describe('LongRunningProcedureClient', () => {
  test(`${ProcedureState.Resolved}`, async () => {
    let startTime: number
    const service: ILongRunningProcedureService<any, any, any> = {
      create: jest.fn(() => {
        startTime = Date.now()
        return 'id'
      })
    , get: jest.fn((): Awaitable<Nullable<ProcedureDetails<string, Error>>> => {
        const elapsedTime = Date.now() - startTime
        if (elapsedTime < 450) return [ProcedureState.Pending]

        return [ProcedureState.Resolved, 'result']
      })
    , delete: jest.fn(() => undefined)
    }
    const client = new LongRunningProcedureClient(service, 100)

    const result = await client.call('foo')

    expect(result).toBe('result')
    expect(service.get).toBeCalledTimes(6)
  })

  test(`${ProcedureState.Rejected}`, async () => {
    const customError = new Error('error')
    let startTime: number
    const service: ILongRunningProcedureService<any, any, any> = {
      create: jest.fn(() => {
        startTime = Date.now()
        return 'id'
      })
    , get: jest.fn((): Awaitable<Nullable<ProcedureDetails<string, Error>>> => {
        const elapsedTime = Date.now() - startTime
        if (elapsedTime < 450) return [ProcedureState.Pending]

        return [ProcedureState.Rejected, customError]
      })
    , delete: jest.fn(() => undefined)
    }
    const client = new LongRunningProcedureClient(service, 100)

    const err = await getErrorPromise(client.call('foo'))

    expect(err).toBe(customError)
    expect(service.get).toBeCalledTimes(6)
  })
})
