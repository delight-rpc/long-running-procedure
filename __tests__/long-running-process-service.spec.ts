import { LongRunningProcessService, ILongRunningProcessServiceStore } from '@src/long-running-process-service'
import { ProcessState, ProcessDetails } from '@src/types'
import { Deferred, delay } from 'extra-promise'
import { Json } from 'justypes'

describe('LongRunningProcessService', () => {
  test(`${ProcessState.Pending}, ${ProcessState.Resolved}`, async () => {
    const deferred = new Deferred<string>()
    const process = jest.fn(() => deferred)
    const map = new Map<string, ProcessDetails<Json, Error>>()
    const store: ILongRunningProcessServiceStore<Json, Error> = {
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
    expect(result3).toBe(null)
  })

  test(`${ProcessState.Pending}, ${ProcessState.Rejected}`, async () => {
    const deferred = new Deferred<string>()
    const process = jest.fn(() => deferred)
    const map = new Map<string, ProcessDetails<Json, Error>>()
    const store: ILongRunningProcessServiceStore<Json, Error> = {
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
    expect(result3).toBe(null)
  })
})

async function runAllMicrotasks(): Promise<void> {
  await delay(0)
}
