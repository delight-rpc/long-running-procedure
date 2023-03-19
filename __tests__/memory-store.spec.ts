import { isNullish } from '@blackglory/prelude'
import { StoreItemState } from '@src/types.js'
import { MemoryStore } from '@src/memory-store.js'

describe('MemoryStore', () => {
  describe('set', () => {
    test('item does not exist', () => {
      const store = new MemoryStore()

      store.set('id', [StoreItemState.Pending])

      const item = store.get('id')
      expect(item).toStrictEqual([StoreItemState.Pending])
    })

    test('item exists', () => {
      const store = new MemoryStore()
      store.set('id', [StoreItemState.Pending])

      store.set('id', [StoreItemState.Resolved, 'result'])

      const item = store.get('id')
      expect(item).toStrictEqual([StoreItemState.Resolved, 'result'])
    })
  })

  describe('get', () => {
    test('item does not exist', () => {
      const store = new MemoryStore()

      const result = store.get('id')

      expect(isNullish(result)).toBe(true)
    })

    test('item exists', () => {
      const store = new MemoryStore()
      store.set('id', [StoreItemState.Pending])

      const result = store.get('id')

      expect(result).toStrictEqual([StoreItemState.Pending])
    })
  })

  describe('delete', () => {
    test('item does not exist', () => {
      const store = new MemoryStore()

      store.delete('id')

      const item = store.get('id')
      expect(isNullish(item)).toBe(true)
    })

    test('item exists', () => {
      const store = new MemoryStore()
      store.set('id', [StoreItemState.Pending])

      store.delete('id')

      const item = store.get('id')
      expect(isNullish(item)).toBe(true)
    })
  })
})
