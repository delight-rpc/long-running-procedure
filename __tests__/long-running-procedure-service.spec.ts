import { LongRunningProcedureService, ILongRunningProcedureServiceStore } from '@src/long-running-procedure-service.js'
import { ProcedureState, ProcedureDetails } from '@src/types.js'
import { Deferred, delay } from 'extra-promise'
import { JSONValue } from 'justypes'
import { jest } from '@jest/globals'

describe('LongRunningProcedureService', () => {
  test(`${ProcedureState.Pending}, ${ProcedureState.Resolved}`, async () => {
    const deferred = new Deferred<string>()
    const process = jest.fn(() => deferred)
    const map = new Map<string, ProcedureDetails<JSONValue, Error>>()
    const store: ILongRunningProcedureServiceStore<JSONValue, Error> = {
      get: jest.fn((id: string) => map.get(id))
    , set: jest.fn((id: string, processDetails: ProcedureDetails<JSONValue, Error>) => {
        map.set(id, processDetails)
        return undefined
      })
    , delete: jest.fn((id: string) => {
        map.delete(id)
        return undefined
      })
    }
    const service = new LongRunningProcedureService(process, store)

    const id = await service.create()
    const result1 = await service.get(id)
    deferred.resolve('result')
    await runAllMicrotasks()
    const result2 = await service.get(id)
    await service.delete(id)
    const result3 = await service.get(id)

    expect(result1).toStrictEqual([ProcedureState.Pending])
    expect(result2).toStrictEqual([ProcedureState.Resolved, 'result'])
    expect(result3).toBe(null)
  })

  test(`${ProcedureState.Pending}, ${ProcedureState.Rejected}`, async () => {
    const deferred = new Deferred<string>()
    const process = jest.fn(() => deferred)
    const map = new Map<string, ProcedureDetails<JSONValue, Error>>()
    const store: ILongRunningProcedureServiceStore<JSONValue, Error> = {
      get: jest.fn((id: string) => map.get(id))
    , set: jest.fn((id: string, processDetails: ProcedureDetails<JSONValue, Error>) => {
        map.set(id, processDetails)
        return undefined
      })
    , delete: jest.fn((id: string) => {
        map.delete(id)
        return undefined
      })
    }
    const service = new LongRunningProcedureService(process, store)

    const id = await service.create()
    const result1 = await service.get(id)
    deferred.reject('error')
    await runAllMicrotasks()
    const result2 = await service.get(id)
    await service.delete(id)
    const result3 = await service.get(id)

    expect(result1).toStrictEqual([ProcedureState.Pending])
    expect(result2).toStrictEqual([ProcedureState.Rejected, 'error'])
    expect(result3).toBe(null)
  })
})

async function runAllMicrotasks(): Promise<void> {
  await delay(0)
}
