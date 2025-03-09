import { app, BrowserWindow, clipboard, globalShortcut, ipcMain, screen } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let win: BrowserWindow | null = null
let previousClipboardContent = ''
let clipboardMonitorInterval: NodeJS.Timer | null = null

function createWindow() {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize

  win = new BrowserWindow({
    width: 400,
    height: 600,
    x: screenWidth - 420,
    y: screenHeight - 620,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, '../dist-electron/preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    show: false,
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  win.on('blur', () => {
    win?.hide()
  })

  win.webContents.on('did-finish-load', () => {
    console.log('Window loaded and ready')
  })

  return win
}

function stopClipboardMonitor() {
  if (clipboardMonitorInterval) {
    clearInterval(clipboardMonitorInterval)
    clipboardMonitorInterval = null
  }
}

function startClipboardMonitor() {
  stopClipboardMonitor()

  clipboardMonitorInterval = setInterval(() => {
    try {
      if (!win) return

      const currentContent = clipboard.readText()

      if (currentContent && currentContent !== previousClipboardContent) {
        console.log('New clipboard content detected')
        previousClipboardContent = currentContent

        if (win.webContents.isLoading()) {
          console.log('Window still loading, waiting...')
          return
        }

        win.webContents.send('clipboard-updated', currentContent)
        console.log('Sent clipboard update to renderer')
      }
    } catch (error) {
      console.error('Error monitoring clipboard:', error)
    }
  }, 500)
}

app.whenReady().then(() => {
  win = createWindow()

  win.webContents.on('did-finish-load', () => {
    console.log('Starting clipboard monitor')
    startClipboardMonitor()

    const initialContent = clipboard.readText()
    if (initialContent) {
      win?.webContents.send('clipboard-updated', initialContent)
    }
  })

  globalShortcut.register('CommandOrControl+Alt+H', () => {
    if (win?.isVisible()) {
      win.hide()
    } else {
      win?.show()
      win?.focus()

      const currentContent = clipboard.readText()
      if (currentContent && currentContent !== previousClipboardContent) {
        previousClipboardContent = currentContent
        win?.webContents.send('clipboard-updated', currentContent)
      }
    }
  })

  ipcMain.handle('paste-content', async (_event, content) => {
    try {
      const activeWin = BrowserWindow.getFocusedWindow()
      clipboard.writeText(content)
      win?.hide()
      if (activeWin) {
        activeWin.webContents.paste()
      }
    } catch (error) {
      console.error('Error pasting content:', error)
    }
  })

  ipcMain.handle('set-clipboard', (_event, content) => {
    try {
      clipboard.writeText(content)
    } catch (error) {
      console.error('Error setting clipboard:', error)
    }
  })
})

app.on('window-all-closed', () => {
  stopClipboardMonitor()
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    win = createWindow()
    win.webContents.on('did-finish-load', () => {
      startClipboardMonitor()
    })
  }
})

app.on('will-quit', () => {
  stopClipboardMonitor()
  globalShortcut.unregisterAll()
})