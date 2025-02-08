import { app, BrowserWindow, clipboard, globalShortcut, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

let win: BrowserWindow | null = null
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

function createWindow() {
  win = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: true,
    },
    show: false,
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(join(__dirname, '../dist/index.html'))
  }

  return win
}

let previousClipboardContent = ''

function monitorClipboard() {
  setInterval(() => {
    const currentContent = clipboard.readText()
    if (currentContent && currentContent !== previousClipboardContent) {
      previousClipboardContent = currentContent
      win?.webContents.send('clipboard-updated', currentContent)
    }
  }, 500)
}

app.whenReady().then(() => {
  createWindow()
  win?.show()
  monitorClipboard()

  globalShortcut.register('Alt+Space', () => {
    if (win?.isVisible()) {
      win.hide()
    } else {
      win?.show()
      win?.focus()
    }
  })

  // IPC handlers
  ipcMain.handle('set-clipboard', (_event, content) => {
    clipboard.writeText(content)
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})