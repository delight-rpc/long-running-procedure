import { LongRunningProcessService, ILongRunningProcessServiceStore } from '@src/long-running-process-service'
import { ProcessState, ProcessDetails } from '@src/types'
import { Deferred, delay } from 'extra-promise'
import { getErrorPromise } from 'return-style'

describe('LongRunningProcessService', () => {
  test(`${ProcessState.Pending}, ${ProcessState.Resolved}`, async () => {
    const deferred = new Deferred<any>()
    const process = jest.fn(() => deferred)
    const map = new Map<string, ProcessDetails<string, Error>>()
    const store: ILongRunningProcessServiceStore<string, Error> = {
      get: jest.fn(id => map.get(id))
    , set: jest.fn((id, processDetails) => {
        map.set(id, processDetails)
        return undefined
      })
    , delete: jest.fn(id => {
        map.delete(id)
        return undefined
      })
    }
    const service = new LongRunningProcessService(process, store)

    const id = await service.create()
    const result1 = await service.get(id)
    deferred.resolve('result')
    await runAllMicrotasks()
    const result2 = await service.get(id)
    await service.delete(id)
    const result3 = await service.get(id)

    expect(result1).toStrictEqual([ProcessState.Pending])
    expect(result2).toStrictEqual([ProcessState.Resolved, 'result'])
    expect(result3).toBe(undefined)
  })

  test(`${ProcessState.Pending}, ${ProcessState.Rejected}`, async () => {
    const deferred = new Deferred<any>()
    const process = jest.fn(() => deferred)
    const map = new Map<string, ProcessDetails<string, Error>>()
    const store: ILongRunningProcessServiceStore<string, Error> = {
      get: jest.fn(id => map.get(id))
    , set: jest.fn((id, processDetails) => {
        map.set(id, processDetails)
        return undefined
      })
    , delete: jest.fn(id => {
        map.delete(id)
        return undefined
      })
    }
    const service = new LongRunningProcessService(process, store)

    const id = await service.create()
    const result1 = await service.get(id)
    deferred.reject('error')
    await runAllMicrotasks()
    const result2 = await service.get(id)
    await service.delete(id)
    const result3 = await service.get(id)

    expect(result1).toStrictEqual([ProcessState.Pending])
    expect(result2).toStrictEqual([ProcessState.Rejected, 'error'])
    expect(result3).toBe(undefined)
  })
})

async function runAllMicrotasks(): Promise<void> {
  await delay(0)
}
