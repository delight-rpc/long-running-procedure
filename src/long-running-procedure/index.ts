import { nanoid } from 'nanoid'
import { ILongRunningProcedure, CallState, CallNotFound } from '@src/contract.js'
import { toResultAsync } from 'return-style'
import { AbortController, AbortError } from 'extra-abort'
import { EventHub, Event } from './event-hub.js'
import { setTimeout } from 'extra-timers'
import { Store, StoreItemState } from '@src/types.js'
import { MemoryStore } from '@src/memory-store.js'
import { SyncDestructor } from 'extra-defer'
import { assert, go } from '@blackglory/prelude'
import { waitForAllMacrotasksProcessed } from '@blackglory/wait-for'

export class LongRunningProcedure<Args extends unknown[], Result, Error>
implements ILongRunningProcedure<Args, Result> {
  private eventHub = new EventHub()
  private idToAbortController: Map<string, AbortController> = new Map()
  private store: Store<Result, Error>
  private timeout?: number
  private timeToLive?: number

  /**
   * 超时和TTL的存在是为了减缓错误的实现耗尽存储空间的速度.
   * 
   * @param timeout 调用的超时时间(毫秒), 超时的调用会被自动中断.
   * @param timeToLive 调用从完成开始计算的存活时间(毫秒), 超出存活时间的调用会被删除.
   */
  constructor(
    private procedure: (...args: [...Args, AbortSignal]) => PromiseLike<Result>
  , {
      store = new MemoryStore<Result, Error>()
    , timeToLive
    , timeout
    }: {
      store?: Store<Result, Error>
      timeout?: number
      timeToLive?: number
    } = {}
  ) {
    this.store = store
    this.timeToLive = timeToLive
    this.timeout = timeout
  }

  async call(args: Args): Promise<string> {
    const abortControllerDestructor = new SyncDestructor()
    const timeoutDestructor = new SyncDestructor()
    const id = this.createId()

    const controller = new AbortController()
    abortControllerDestructor.defer(() => controller.abort())

    this.idToAbortController.set(id, controller)
    abortControllerDestructor.defer(() => this.idToAbortController.delete(id))

    this.eventHub.register(id)
    await this.store.set(id, [StoreItemState.Pending], this.timeout)

    if (this.timeout) {
      const cancelTimeout = setTimeout(this.timeout, () => controller.abort())
      timeoutDestructor.defer(cancelTimeout)
    }

    go(async () => {
      const result = await toResultAsync<Error, Result>(() => {
        return this.procedure(...args, controller.signal)
      })

      timeoutDestructor.execute()

      const item = await this.store.get(id)
      if (item) {
        if (result.isOk()) {
          await this.store.set(
            id
          , [StoreItemState.Resolved, result.unwrap()]
          , this.timeToLive
          )
        } else {
          await this.store.set(
            id
          , [StoreItemState.Rejected, result.unwrapErr()]
          , this.timeToLive
          )
        }

        if (this.timeToLive) {
          const cancelTimeout = setTimeout(this.timeToLive, () => this.remove(id))
          this.eventHub.once(id, Event.Removed, cancelTimeout)
        }

        this.eventHub.emit(id, Event.Settled)
      } else {
        await this.remove(id)
      }

      abortControllerDestructor.execute()
    })

    return id
  }

  abort(id: string): null {
    this.idToAbortController.get(id)?.abort()

    return null
  }

  async getState(id: string): Promise<CallState> {
    const item = await this.store.get(id)
    if (item) {
      const [state] = item

      switch (state) {
        case StoreItemState.Pending: return CallState.Pending
        case StoreItemState.Resolved:
        case StoreItemState.Rejected: {
          return CallState.Settled
        }
        default: throw new Error(`Unknown store state ${state}`)
      }
    } else {
      throw new CallNotFound()
    }
  }

  async getResult(id: string): Promise<Result> {
    const item = await this.store.get(id)

    if (item) {
      const [state, value] = item

      switch (state) {
        case StoreItemState.Pending: {
          const controller = this.idToAbortController.get(id)
          assert(controller)

          try {
            await this.eventHub.waitFor(id, Event.Settled, controller.signal)
          } catch (e) {
            if (e instanceof AbortError) {
              // 防止在`store.get()`是同步函数时占用事件循环.
              await waitForAllMacrotasksProcessed()
            } else {
              throw e
            }
          }

          return await this.getResult(id)
        }
        case StoreItemState.Resolved: return value
        case StoreItemState.Rejected: throw value
        default: throw new Error(`Unknown store state ${state}`)
      }
    } else {
      throw new CallNotFound()
    }
  }

  async remove(id: string): Promise<null> {
    const item = await this.store.get(id)

    if (item) {
      const [state] = item

      switch (state) {
        case StoreItemState.Pending: throw new Error('The call is still pending')
        case StoreItemState.Resolved:
        case StoreItemState.Rejected: {
          await this.store.delete(id)

          break
        }
        default: throw new Error(`Unknown store state ${state}`)
      }
    }

    if (this.eventHub.has(id)) this.eventHub.unregister(id)

    return null
  }

  private createId(): string {
    return nanoid()
  }
}
