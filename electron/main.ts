import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'

const isDev = !app.isPackaged
const DB_FILENAME = 'pharmaregistre.sqlite'

const AUTO_BACKUP_DIR = 'sauvegardes-auto'
const AUTO_BACKUP_KEEP = 10

function dbFilePath(): string {
  return path.join(app.getPath('userData'), DB_FILENAME)
}

function autoBackupDir(): string {
  return path.join(app.getPath('userData'), AUTO_BACKUP_DIR)
}

function wasmFilePath(): string {
  if (isDev) {
    return path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
  }
  return path.join(process.resourcesPath, 'sql-wasm.wasm')
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#f4f6f4',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  win.once('ready-to-show', () => win.show())

  // Give the renderer a chance to flush the last DB write to disk before the
  // process actually exits — a quit right after an edit must never race the save.
  let readyToClose = false
  win.on('close', (event) => {
    if (readyToClose) return
    event.preventDefault()
    win.webContents.send('app-closing')
    const forceCloseTimer = setTimeout(() => {
      readyToClose = true
      win.close()
    }, 2000)
    ipcMain.once('renderer-flushed', () => {
      clearTimeout(forceCloseTimer)
      readyToClose = true
      win.close()
    })
  })

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('get-wasm-bytes', async () => {
  const buf = await fs.promises.readFile(wasmFilePath())
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
})

ipcMain.handle('load-db-file', async () => {
  try {
    const buf = await fs.promises.readFile(dbFilePath())
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  } catch {
    return null
  }
})

ipcMain.handle('save-db-file', async (_evt, bytes: ArrayBuffer) => {
  await fs.promises.mkdir(app.getPath('userData'), { recursive: true })
  await fs.promises.writeFile(dbFilePath(), Buffer.from(bytes))
})

ipcMain.handle('export-file', async (_evt, defaultName: string, filters: { name: string; extensions: string[] }[], content: string | ArrayBuffer) => {
  const win = BrowserWindow.getFocusedWindow()
  const options = { defaultPath: defaultName, filters }
  const { canceled, filePath } = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options)
  if (canceled || !filePath) return { canceled: true }
  const data = typeof content === 'string' ? Buffer.from(content, 'utf-8') : Buffer.from(content)
  await fs.promises.writeFile(filePath, data)
  return { canceled: false, path: filePath }
})

ipcMain.handle('get-app-info', async () => {
  return { version: app.getVersion(), dbPath: dbFilePath() }
})

ipcMain.handle('reveal-db-file', async () => {
  shell.showItemInFolder(dbFilePath())
})

/** Snapshots the current database into a rotating folder of timestamped copies, keeping the most recent AUTO_BACKUP_KEEP — a safety net beyond manual backups. */
ipcMain.handle('auto-backup', async () => {
  try {
    await fs.promises.access(dbFilePath())
  } catch {
    return { ok: false }
  }
  const dir = autoBackupDir()
  await fs.promises.mkdir(dir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const dest = path.join(dir, `sauvegarde-auto-${stamp}.sqlite`)
  await fs.promises.copyFile(dbFilePath(), dest)
  const files = (await fs.promises.readdir(dir)).filter((f) => f.startsWith('sauvegarde-auto-')).sort()
  const excess = files.length - AUTO_BACKUP_KEEP
  if (excess > 0) {
    await Promise.all(files.slice(0, excess).map((f) => fs.promises.unlink(path.join(dir, f)).catch(() => {})))
  }
  return { ok: true, path: dest }
})

ipcMain.handle('reveal-backups-folder', async () => {
  const dir = autoBackupDir()
  await fs.promises.mkdir(dir, { recursive: true })
  shell.openPath(dir)
})

/** Fixed, hardcoded destination — never takes a renderer-supplied URL, so there is no arbitrary-external-link surface. */
ipcMain.handle('ouvrir-farpopq', async () => {
  await shell.openExternal('https://www.farpopq.com/connexion')
})

ipcMain.handle('hash-password', async (_evt, password: string) => {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return { salt, hash }
})

ipcMain.handle('verify-password', async (_evt, password: string, salt: string, hash: string) => {
  try {
    const check = crypto.scryptSync(password, salt, 64)
    const stored = Buffer.from(hash, 'hex')
    if (check.length !== stored.length) return false
    return crypto.timingSafeEqual(check, stored)
  } catch {
    return false
  }
})
