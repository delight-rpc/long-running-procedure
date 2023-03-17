import { LongRunningProcessClient } from '@src/long-running-process-client.js'
import { ProcessState, ILongRunningProcessService, ProcessDetails } from '@src/types.js'
import { getErrorPromise } from 'return-style'
import { jest } from '@jest/globals'
import { Awaitable, Nullable } from '@blackglory/prelude'

describe('LongRunningProcessClient', () => {
  test(`${ProcessState.Resolved}`, async () => {
    let startTime: number
    const service: ILongRunningProcessService<any, any, any> = {
      create: jest.fn(() => {
        startTime = Date.now()
        return 'id'
      })
    , get: jest.fn((): Awaitable<Nullable<ProcessDetails<string, Error>>> => {
        const elapsedTime = Date.now() - startTime
        if (elapsedTime < 450) return [ProcessState.Pending]

        return [ProcessState.Resolved, 'result']
      })
    , delete: jest.fn(() => undefined)
    }
    const client = new LongRunningProcessClient(service, 100)

    const result = await client.call('foo')

    expect(result).toBe('result')
    expect(service.get).toBeCalledTimes(6)
  })

  test(`${ProcessState.Rejected}`, async () => {
    const customError = new Error('error')
    let startTime: number
    const service: ILongRunningProcessService<any, any, any> = {
      create: jest.fn(() => {
        startTime = Date.now()
        return 'id'
      })
    , get: jest.fn((): Awaitable<Nullable<ProcessDetails<string, Error>>> => {
        const elapsedTime = Date.now() - startTime
        if (elapsedTime < 450) return [ProcessState.Pending]

        return [ProcessState.Rejected, customError]
      })
    , delete: jest.fn(() => undefined)
    }
    const client = new LongRunningProcessClient(service, 100)

    const err = await getErrorPromise(client.call('foo'))

    expect(err).toBe(customError)
    expect(service.get).toBeCalledTimes(6)
  })
})
