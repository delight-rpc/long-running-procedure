import { LongRunningProcessService, ILongRunningProcessServiceStore } from '@src/long-running-process-service'
import { ProcessState } from '@src/types'
import { Deferred, delay } from 'extra-promise'
import { getErrorPromise } from 'return-style'

describe('LongRunningProcessService', () => {
  test(`${ProcessState.Pending}, ${ProcessState.Resolved}`, async () => {
    const deferred = new Deferred<any>()
    const process = jest.fn(() => deferred)
    const stateMap = new Map<string, ProcessState>()
    const valueMap = new Map<string, any>()
    const store: ILongRunningProcessServiceStore<any, any> = {
      getState: jest.fn(id => stateMap.get(id))
    , setState: jest.fn((id, state) => {
        stateMap.set(id, state)
        return undefined
      })
    , getValue: jest.fn(id => valueMap.get(id))
    , setValue: jest.fn((id, value) => {
        valueMap.set(id, value)
        return undefined
      })
    , delete: jest.fn(id => {
        stateMap.delete(id)
        valueMap.delete(id)
        return undefined
      })
    }
    const service = new LongRunningProcessService(process, store)

    const id = await service.create()
    const state1 = await service.getState(id)
    const result1 = await service.getValue(id)
    deferred.resolve('result')
    await runAllMicrotasks()
    const state2 = await service.getState(id)
    const result2 = await service.getValue(id)
    await service.delete(id)
    const state3 = await getErrorPromise(service.getState(id))
    const result3 = await getErrorPromise(service.getValue(id))

    expect(state1).toBe(ProcessState.Pending)
    expect(result1).toBe(undefined)
    expect(state2).toBe(ProcessState.Resolved)
    expect(result2).toBe('result')
    expect(state3).toBe(undefined)
    expect(result3).toBe(undefined)
  })

  test(`${ProcessState.Pending}, ${ProcessState.Rejected}`, async () => {
    const deferred = new Deferred<any>()
    const process = jest.fn(() => deferred)
    const stateMap = new Map<string, ProcessState>()
    const valueMap = new Map<string, any>()
    const store: ILongRunningProcessServiceStore<any, any> = {
      getState: jest.fn(id => stateMap.get(id))
    , setState: jest.fn((id, state) => {
        stateMap.set(id, state)
        return undefined
      })
    , getValue: jest.fn(id => valueMap.get(id))
    , setValue: jest.fn((id, value) => {
        valueMap.set(id, value)
        return undefined
      })
    , delete: jest.fn(id => {
        stateMap.delete(id)
        valueMap.delete(id)
        return undefined
      })
    }
    const service = new LongRunningProcessService(process, store)

    const id = await service.create()
    const state1 = await service.getState(id)
    const result1 = await service.getValue(id)
    deferred.reject('error')
    await runAllMicrotasks()
    const state2 = await service.getState(id)
    const result2 = await service.getValue(id)
    await service.delete(id)
    const state3 = await getErrorPromise(service.getState(id))
    const result3 = await getErrorPromise(service.getValue(id))

    expect(state1).toBe(ProcessState.Pending)
    expect(result1).toBe(undefined)
    expect(state2).toBe(ProcessState.Rejected)
    expect(result2).toBe('error')
    expect(state3).toBe(undefined)
    expect(result3).toBe(undefined)
  })
})

async function runAllMicrotasks(): Promise<void> {
  await delay(0)
}
