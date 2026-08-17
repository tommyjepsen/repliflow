/**
 * Tiny IndexedDB wrapper. Projects live in `projects`; generated images and
 * videos are cached as blobs in `assets`, because Replicate's delivery URLs
 * expire about an hour after a prediction finishes.
 */

const DB_NAME = 'replicater'
const VERSION = 2

export type StoreName = 'projects' | 'assets' | 'gallery'

let dbPromise: Promise<IDBDatabase> | null = null

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('assets')) {
        db.createObjectStore('assets')
      }
      if (!db.objectStoreNames.contains('gallery')) {
        db.createObjectStore('gallery', { keyPath: 'key' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function run<T>(
  store: StoreName,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest,
): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(store, mode)
        const req = fn(tx.objectStore(store))
        req.onsuccess = () => resolve(req.result as T)
        req.onerror = () => reject(req.error)
      }),
  )
}

export function idbGet<T>(store: StoreName, key: IDBValidKey) {
  return run<T | undefined>(store, 'readonly', (s) => s.get(key))
}

export function idbPut(store: StoreName, value: unknown, key?: IDBValidKey) {
  return run<IDBValidKey>(store, 'readwrite', (s) => s.put(value, key))
}

export function idbDelete(store: StoreName, key: IDBValidKey | IDBKeyRange) {
  return run<undefined>(store, 'readwrite', (s) => s.delete(key))
}

export function idbGetAll<T>(store: StoreName) {
  return run<T[]>(store, 'readonly', (s) => s.getAll())
}

/** Deletes every asset whose key starts with `prefix`. */
export function idbDeletePrefix(store: StoreName, prefix: string) {
  return idbDelete(store, IDBKeyRange.bound(prefix, `${prefix}￿`))
}
