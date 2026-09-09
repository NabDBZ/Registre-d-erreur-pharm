// Persistence bridge: when running inside Electron, the real SQLite file lives on
// disk (via IPC to the main process). When running standalone in a browser (used
// during UI development in the Browser pane), we fall back to IndexedDB so the
// exact same app code can be exercised without Electron.

export interface PersistenceAdapter {
  load(): Promise<Uint8Array | null>
  save(bytes: Uint8Array): Promise<void>
}

const IDB_NAME = 'pharma-registre-dev'
const IDB_STORE = 'db'
const IDB_KEY = 'sqlite-bytes'

function openIdb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

class BrowserPersistence implements PersistenceAdapter {
  async load(): Promise<Uint8Array | null> {
    const db = await openIdb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly')
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY)
      req.onsuccess = () => resolve(req.result ? new Uint8Array(req.result) : null)
      req.onerror = () => reject(req.error)
    })
  }

  async save(bytes: Uint8Array): Promise<void> {
    const db = await openIdb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).put(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), IDB_KEY)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }
}

class ElectronPersistence implements PersistenceAdapter {
  async load(): Promise<Uint8Array | null> {
    const bytes = await window.api!.loadDbFile()
    return bytes ? new Uint8Array(bytes) : null
  }

  async save(bytes: Uint8Array): Promise<void> {
    await window.api!.saveDbFile(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer)
  }
}

export function getPersistenceAdapter(): PersistenceAdapter {
  if (typeof window !== 'undefined' && window.api) {
    return new ElectronPersistence()
  }
  return new BrowserPersistence()
}
