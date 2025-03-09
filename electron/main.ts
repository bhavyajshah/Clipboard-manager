import { app, BrowserWindow, clipboard, globalShortcut, ipcMain, screen } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let win: BrowserWindow | null = null
let previousClipboardContent = ''
let clipboardMonitorInterval: NodeJS.Timer | null = null
let isUpdatingClipboard = false

function createWindow() {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize

  console.log('[Main] Creating window...')

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
      preload: path.join(__dirname, '../dist-electron/preload.js'),
      contextIsolation: true,
      nodeIntegration: true,
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
    console.log('[Main] Window loaded and ready')
  })

  // For development
  if (process.env.VITE_DEV_SERVER_URL) {
    win.webContents.openDevTools({ mode: 'detach' })
  }

  return win
}

function showWindow() {

 if (win?.isVisible()) {

      win.hide()

    } else {

      win?.show()

      win?.focus()



      // Force clipboard check when window is shown

      const currentContent = clipboard.readText()

      if (currentContent && currentContent !== previousClipboardContent) {

        previousClipboardContent = currentContent

        win?.webContents.send('clipboard-updated', currentContent)

      }

    }
}

function stopClipboardMonitor() {
  console.log('[Main] Stopping clipboard monitor')
  if (clipboardMonitorInterval) {
    clearInterval(clipboardMonitorInterval as NodeJS.Timeout)
    clipboardMonitorInterval = null
  }
}

function startClipboardMonitor() {
  console.log('[Main] Starting clipboard monitor')
  stopClipboardMonitor()

  clipboardMonitorInterval = setInterval(() => {
    try {
      if (!win || isUpdatingClipboard) {
        return
      }

      const currentContent = clipboard.readText()

      if (currentContent && currentContent !== previousClipboardContent) {
        console.log('[Main] New clipboard content detected:', currentContent)
        previousClipboardContent = currentContent

        if (win.webContents.isLoading()) {
          console.log('[Main] Window still loading, waiting...')
          return
        }

        win.webContents.send('clipboard-updated', currentContent)
      }
    } catch (error) {
      console.error('[Main] Error monitoring clipboard:', error)
    }
  }, 1000)
}

app.whenReady().then(() => {
  console.log('[Main] App is ready')
  win = createWindow()

  win.webContents.on('did-finish-load', () => {
    console.log('[Main] Window finished loading, starting clipboard monitor')
    startClipboardMonitor()

    const initialContent = clipboard.readText()
    if (initialContent) {
      win?.webContents.send('clipboard-updated', initialContent)
    }
  })

  globalShortcut.register('CommandOrControl+Alt+H', () => {
    showWindow()
  })

  ipcMain.handle('paste-content', async (_event, content) => {
    try {
      isUpdatingClipboard = true
      const activeWin = BrowserWindow.getFocusedWindow()
      clipboard.writeText(content)
      win?.hide()
      if (activeWin) {
        activeWin.webContents.paste()
      }
    } catch (error) {
      console.error('[Main] Error pasting content:', error)
    } finally {
      isUpdatingClipboard = false
    }
  })

  ipcMain.handle('set-clipboard', (_event, content) => {
    try {
      isUpdatingClipboard = true
      clipboard.writeText(content)
      previousClipboardContent = content
    } catch (error) {
      console.error('[Main] Error setting clipboard:', error)
    } finally {
      isUpdatingClipboard = false
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