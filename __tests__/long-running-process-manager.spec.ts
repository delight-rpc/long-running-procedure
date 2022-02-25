import { LongRunningProcessManager } from '@src/long-running-process-manager'
import { IStore } from '@src/types'
import { Deferred, delay } from 'extra-promise'
import { getErrorPromise } from 'return-style'

describe('LongRunningProcessManager', () => {
  test('starting, running, done', async () => {
    const deferred = new Deferred<any>()
    const process = jest.fn(() => deferred)
    const map = new Map<string, any>()
    const store: IStore<any> = {
      get: jest.fn(id => {
        return map.get(id) ?? null
      })
    , delete: jest.fn(id => {
        map.delete(id)
      })
    , set: jest.fn((id, value) => {
        map.set(id, value)
      })
    }

    const manager = new LongRunningProcessManager({
      process
    , store
    })

    const id = manager.startProcess()
    const state1 = manager.getProcessState(id)
    await runAllMicrotasks()
    const state2 = manager.getProcessState(id)
    deferred.resolve('foo')
    await runAllMicrotasks()
    const state3 = manager.getProcessState(id)
    const result1 = await manager.getProcessResult(id)
    const exists1 = map.has(id)
    await manager.endProcess(id)
    const exists2 = map.has(id)
    const result2 = await getErrorPromise(manager.getProcessResult(id))

    expect(state1).toBe('starting')
    expect(state2).toBe('running')
    expect(state3).toBe('done')
    expect(result1).toBe('foo')
    expect(exists1).toBe(true)
    expect(exists2).toBe(false)
    expect(result2).toBeInstanceOf(Error)
  })

  test('starting, running, error', async () => {
    const deferred = new Deferred<any>()
    const process = jest.fn(() => deferred)
    const map = new Map<string, any>()
    const store: IStore<any> = {
      get: jest.fn(id => {
        return map.get(id) ?? null
      })
    , delete: jest.fn(id => {
        map.delete(id)
      })
    , set: jest.fn((id, value) => {
        map.set(id, value)
      })
    }

    const manager = new LongRunningProcessManager({
      process
    , store
    })

    const id = manager.startProcess()
    const state1 = manager.getProcessState(id)
    await runAllMicrotasks()
    const state2 = manager.getProcessState(id)
    deferred.reject(new Error('foo'))
    await runAllMicrotasks()
    const state3 = manager.getProcessState(id)
    const err1 = await manager.getProcessError(id)
    const exists1 = map.has(id)
    await manager.endProcess(id)
    const exists2 = map.has(id)
    const err2 = await getErrorPromise(manager.getProcessError(id))

    expect(state1).toBe('starting')
    expect(state2).toBe('running')
    expect(state3).toBe('error')
    expect(err1).toStrictEqual({
      name: 'Error'
    , message: 'foo'
    , ancestors: []
    , stack: expect.any(String)
    })
    expect(exists1).toBe(true)
    expect(exists2).toBe(false)
    expect(err2).toBeInstanceOf(Error)
  })
})

async function runAllMicrotasks(): Promise<void> {
  await delay(0)
}
