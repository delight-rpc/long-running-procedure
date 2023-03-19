import { CustomError } from '@blackglory/errors'
import { Awaitable, Nullish } from '@blackglory/prelude'

export enum CallState {
  Pending
, Settled
}

export interface ILongRunningProcedure<Args extends any[], Result> {
  /**
   * 调用此过程.
   * 
   * @returns 该调用的id.
   */
  call(args: Args): Awaitable<string>

  /**
   * 中断一个还未完成的调用.
   * 如果该调用已经完成或调用不存在, 该函数会静默失败.
   */
  abort(id: string): Awaitable<Nullish>

  /**
   * 返回调用的状态.
   * 
   * @throws {CallNotFound}
   */
  getState(id: string): Awaitable<CallState>

  /**
   * 获取调用的结果, 如果调用尚未完成, 则会阻塞直到完成.
   * 
   * @throws {CallNotFound}
   */
  getResult(id: string): Awaitable<Result>

  /**
   * 删除一个已经完成的调用, 这会导致与该调用相关的信息被删除.
   * 如果该调用还未完成, 则该操作会抛出错误.
   * 如果该调用已经删除, 则该操作会静默失败.
   */
  remove(id: string): Awaitable<Nullish>
}

export class CallNotFound extends CustomError {}
