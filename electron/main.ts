import { app, BrowserWindow, clipboard, globalShortcut, ipcMain, screen } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let win: BrowserWindow | null = null

function createWindow() {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize

  win = new BrowserWindow({
    width: 300,
    height: 400,
    x: screenWidth - 320, // Position near the right edge
    y: screenHeight - 420, // Position near the bottom
    frame: false, // Remove window frame
    transparent: true, // Make window transparent
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true, // Don't show in taskbar
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
    // win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Hide window when it loses focus
  win.on('blur', () => {
    win?.hide()
  })

  return win
}

let previousClipboardContent = ''

function monitorClipboard() {
  setInterval(() => {
    if (!win) return
    const currentContent = clipboard.readText()
    if (currentContent && currentContent !== previousClipboardContent) {
      previousClipboardContent = currentContent
      win.webContents.send('clipboard-updated', currentContent)
    }
  }, 500)
}

app.whenReady().then(() => {
  createWindow()
  monitorClipboard()

  // Register Windows + Alt + H shortcut
  globalShortcut.register('CommandOrControl+Alt+H', () => {
    if (win?.isVisible()) {
      win.hide()
    } else {
      win?.show()
      win?.focus()
    }
  })

  // Handle paste request
  ipcMain.handle('paste-content', async (_event, content) => {
    const activeWin = BrowserWindow.getFocusedWindow()

    // Set clipboard content
    clipboard.writeText(content)

    // Hide the window
    win?.hide()

    // Simulate Ctrl+V to paste
    if (activeWin) {
      activeWin.webContents.paste()
    }
  })

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

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})