import { LongRunningProcessInvoker } from '@src/long-running-process-invoker'
import { normalize } from '@blackglory/errors'
import { getErrorPromise } from 'return-style'

describe('LongRunningProcessInvoker', () => {
  test('done', async () => {
    const manager = {
      startProcess: jest.fn()
        .mockResolvedValue('id')
    , endProcess: jest.fn()
    , getProcessState: jest.fn()
        .mockResolvedValueOnce('starting')
        .mockResolvedValueOnce('running')
        .mockResolvedValueOnce('done')
    , getProcessResult: jest.fn()
        .mockResolvedValue('bar')
    , getProcessError: jest.fn()
    }

    const invoker = new LongRunningProcessInvoker({
      manager
    , pollingInterval: 1000
    , withRetry: async x => x()
    })
    const result = await invoker.invoke('foo')

    expect(result).toBe('bar')
    expect(manager.startProcess).toBeCalledTimes(1)
    expect(manager.startProcess).toBeCalledWith('foo')
    expect(manager.getProcessState).toBeCalledTimes(3)
    expect(manager.endProcess).toBeCalledTimes(1)
    expect(manager.endProcess).toBeCalledWith('id')
    expect(manager.getProcessError).not.toBeCalled()
  })

  test('error', async () => {
    const manager = {
      startProcess: jest.fn()
        .mockResolvedValue('id')
    , endProcess: jest.fn()
    , getProcessState: jest.fn()
        .mockResolvedValueOnce('starting')
        .mockResolvedValueOnce('running')
        .mockResolvedValueOnce('error')
    , getProcessResult: jest.fn()
    , getProcessError: jest.fn()
        .mockResolvedValue(normalize(new Error('bar')))
    }

    const invoker = new LongRunningProcessInvoker({
      manager
    , pollingInterval: 1000
    , withRetry: async x => x()
    })
    const err = await getErrorPromise(invoker.invoke('foo'))

    expect(err).toBeInstanceOf(Error)
    expect(err?.message).toMatch(/bar/)
    expect(manager.startProcess).toBeCalledTimes(1)
    expect(manager.startProcess).toBeCalledWith('foo')
    expect(manager.getProcessState).toBeCalledTimes(3)
    expect(manager.endProcess).toBeCalledTimes(1)
    expect(manager.endProcess).toBeCalledWith('id')
    expect(manager.getProcessResult).not.toBeCalled()
  })
})
