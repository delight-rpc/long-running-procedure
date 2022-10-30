import { LongRunningProcessClient } from '@src/long-running-process-client'
import { ProcessState, ILongRunningProcessService } from '@src/types'
import { getErrorPromise } from 'return-style'

describe('LongRunningProcessClient', () => {
  test(`${ProcessState.Resolved}`, async () => {
    let startTime: number
    const service: ILongRunningProcessService<any, any, any> = {
      create: jest.fn(() => {
        startTime = Date.now()
        return 'id'
      })
    , getState: jest.fn(() => {
        const elapsedTime = Date.now() - startTime
        if (elapsedTime < 450) return ProcessState.Pending

        return ProcessState.Resolved
      })
    , getValue: jest.fn(() => 'result')
    , delete: jest.fn()
    }
    const client = new LongRunningProcessClient(service, 100)

    const result = await client.call('foo')

    expect(result).toBe('result')
    expect(service.getState).toBeCalledTimes(6)
  })

  test(`${ProcessState.Rejected}`, async () => {
    const customError = new Error('error')
    let startTime: number
    const service: ILongRunningProcessService<any, any, any> = {
      create: jest.fn(() => {
        startTime = Date.now()
        return 'id'
      })
    , getState: jest.fn(() => {
        const elapsedTime = Date.now() - startTime
        if (elapsedTime < 450) return ProcessState.Pending

        return ProcessState.Rejected
      })
    , getValue: jest.fn(() => customError)
    , delete: jest.fn()
    }
    const client = new LongRunningProcessClient(service, 100)

    const err = await getErrorPromise(client.call('foo'))

    expect(err).toBe(customError)
    expect(service.getState).toBeCalledTimes(6)
  })
})
