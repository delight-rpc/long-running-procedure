import { LongRunningProcessService, ILongRunningProcessServiceStore } from '@src/long-running-process-service.js'
import { ProcessState, ProcessDetails } from '@src/types.js'
import { Deferred, delay } from 'extra-promise'
import { JSONValue } from 'justypes'
import { jest } from '@jest/globals'

describe('LongRunningProcessService', () => {
  test(`${ProcessState.Pending}, ${ProcessState.Resolved}`, async () => {
    const deferred = new Deferred<string>()
    const process = jest.fn(() => deferred)
    const map = new Map<string, ProcessDetails<JSONValue, Error>>()
    const store: ILongRunningProcessServiceStore<JSONValue, Error> = {
      get: jest.fn((id: string) => map.get(id))
    , set: jest.fn((id: string, processDetails: ProcessDetails<JSONValue, Error>) => {
        map.set(id, processDetails)
        return undefined
      })
    , delete: jest.fn((id: string) => {
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
    const map = new Map<string, ProcessDetails<JSONValue, Error>>()
    const store: ILongRunningProcessServiceStore<JSONValue, Error> = {
      get: jest.fn((id: string) => map.get(id))
    , set: jest.fn((id: string, processDetails: ProcessDetails<JSONValue, Error>) => {
        map.set(id, processDetails)
        return undefined
      })
    , delete: jest.fn((id: string) => {
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
