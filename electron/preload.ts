import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  getWasmBytes: () => ipcRenderer.invoke('get-wasm-bytes'),
  loadDbFile: () => ipcRenderer.invoke('load-db-file'),
  saveDbFile: (bytes: ArrayBuffer) => ipcRenderer.invoke('save-db-file', bytes),
  exportFile: (defaultName: string, filters: { name: string; extensions: string[] }[], content: string | ArrayBuffer) =>
    ipcRenderer.invoke('export-file', defaultName, filters, content),
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  revealDbFile: () => ipcRenderer.invoke('reveal-db-file'),
  autoBackup: () => ipcRenderer.invoke('auto-backup'),
  revealBackupsFolder: () => ipcRenderer.invoke('reveal-backups-folder'),
  ouvrirFarpopq: () => ipcRenderer.invoke('ouvrir-farpopq'),
  onCloseRequested: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('app-closing', handler)
    return () => ipcRenderer.removeListener('app-closing', handler)
  },
  confirmFlushed: () => ipcRenderer.send('renderer-flushed'),
  hashPassword: (password: string) => ipcRenderer.invoke('hash-password', password),
  verifyPassword: (password: string, salt: string, hash: string) => ipcRenderer.invoke('verify-password', password, salt, hash)
})
