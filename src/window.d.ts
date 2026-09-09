export interface ElectronApi {
  getWasmBytes(): Promise<ArrayBuffer>
  loadDbFile(): Promise<ArrayBuffer | null>
  saveDbFile(bytes: ArrayBuffer): Promise<void>
  exportFile(defaultName: string, filters: { name: string; extensions: string[] }[], content: string | ArrayBuffer): Promise<{ canceled: boolean; path?: string }>
  getAppInfo(): Promise<{ version: string; dbPath: string }>
  revealDbFile(): Promise<void>
  autoBackup(): Promise<{ ok: boolean; path?: string }>
  revealBackupsFolder(): Promise<void>
  ouvrirFarpopq(): Promise<void>
  onCloseRequested(callback: () => void): () => void
  confirmFlushed(): void
  hashPassword(password: string): Promise<{ salt: string; hash: string }>
  verifyPassword(password: string, salt: string, hash: string): Promise<boolean>
}

declare global {
  interface Window {
    api?: ElectronApi
  }
}
